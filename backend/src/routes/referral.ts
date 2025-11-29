import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'openemr',
  password: process.env.DB_PASSWORD || 'openemr',
  database: process.env.DB_NAME || 'openemr',
};

const CURRENT_USER_ID = parseInt(process.env.CURRENT_USER_ID || '1');
const GROUPNAME = process.env.GROUPNAME || 'Default';

interface ReferralRequestBody {
  pid: string;
  reason: string;
  referralDate: string;
  referToFirstName: string;
  referToLastName: string;
  referByFirstName: string;
  referByLastName: string;
}

async function addProvider(
  connection: mysql.PoolConnection,
  fname: string,
  lname: string,
  authorized: number = 0
): Promise<number> {
  // Check if already exists
  const [existing] = (await connection.execute(
    `SELECT id FROM users 
     WHERE username = '' AND fname = ? AND lname = ? AND authorized = ?`,
    [fname, lname, authorized]
  )) as any[];

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Insert new
  const [result] = (await connection.execute(
    `INSERT INTO users (username, password, authorized, active, fname, lname, mname, suffix, facility_id, calendar, cal_ui)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['', '', authorized, 1, fname, lname, '', '', 0, 1, 1]
  )) as any;

  return result.insertId;
}

async function getFieldId(
  connection: mysql.PoolConnection,
  formId: string,
  fieldTitle: string
): Promise<string> {
  const [rows] = (await connection.execute(
    `SELECT field_id FROM layout_options WHERE form_id = ? AND title = ?`,
    [formId, fieldTitle]
  )) as any[];

  if (rows && rows.length > 0) {
    return rows[0].field_id;
  }

  throw new Error(`Field '${fieldTitle}' not found in form '${formId}'`);
}

router.post('/', async (req: Request, res: Response) => {
  let connection: mysql.PoolConnection | null = null;

  try {
    // Parse request body
    const {
      pid,
      reason,
      referralDate,
      referToFirstName,
      referToLastName,
      referByFirstName,
      referByLastName,
    }: ReferralRequestBody = req.body;

    // Validate required fields
    if (
      !pid ||
      !reason ||
      !referralDate ||
      !referToFirstName ||
      !referToLastName ||
      !referByFirstName ||
      !referByLastName
    ) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Create database connection pool
    const pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Check if patient ID exists
    const [patientRows] = (await connection.execute(
      'SELECT pid FROM patient_data WHERE pid = ?',
      [pid]
    )) as any[];

    if (!patientRows || patientRows.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        error: `Patient ID ${pid} does not exist. Cannot insert referral.`,
      });
    }

    // Add or get refer_to ID (external provider)
    const referToId = await addProvider(
      connection,
      referToFirstName,
      referToLastName,
      0
    );

    // Add or get refer_by ID (internal provider)
    const referById = await addProvider(
      connection,
      referByFirstName,
      referByLastName,
      1
    );

    // Insert transaction header
    const title = 'LBTref';
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const authorized = 1;

    const [transResult] = (await connection.execute(
      `INSERT INTO transactions (date, title, pid, user, groupname, authorized)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [date, title, pid, CURRENT_USER_ID, GROUPNAME, authorized]
    )) as any;

    const transId = transResult.insertId;

    // Insert into forms table
    const formName = 'LBTref';
    const encounter = 0;
    const formdir = 'LBTref';

    await connection.execute(
      `INSERT INTO forms (date, encounter, form_name, form_id, pid, user, groupname, authorized, deleted, formdir)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        date,
        encounter,
        formName,
        transId,
        pid,
        CURRENT_USER_ID,
        GROUPNAME,
        authorized,
        0,
        formdir,
      ]
    );

    // Get field IDs for LBT form
    const formId = 'LBTref';
    const fieldTitles = {
      refer_to: 'Refer To',
      refer_from: 'Refer By',
      refer_date: 'Referral Date',
      diagnosis: 'Referrer Diagnosis',
    };

    const fieldIds: Record<string, string> = {};
    for (const [key, title] of Object.entries(fieldTitles)) {
      fieldIds[key] = await getFieldId(connection, formId, title);
    }

    // Try to get body field for reason (optional)
    try {
      fieldIds['body'] = await getFieldId(connection, formId, 'Reason');
    } catch (error) {
      // Body field not found, skip it
    }

    // Insert form data into lbt_data
    await connection.execute(
      `INSERT INTO lbt_data (form_id, field_id, field_value) VALUES (?, ?, ?)`,
      [transId, fieldIds['refer_to'], String(referToId)]
    );

    await connection.execute(
      `INSERT INTO lbt_data (form_id, field_id, field_value) VALUES (?, ?, ?)`,
      [transId, fieldIds['refer_from'], String(referById)]
    );

    await connection.execute(
      `INSERT INTO lbt_data (form_id, field_id, field_value) VALUES (?, ?, ?)`,
      [transId, fieldIds['refer_date'], referralDate]
    );

    await connection.execute(
      `INSERT INTO lbt_data (form_id, field_id, field_value) VALUES (?, ?, ?)`,
      [transId, fieldIds['diagnosis'], reason]
    );

    // Reason (body field) - if it exists
    if (fieldIds['body']) {
      await connection.execute(
        `INSERT INTO lbt_data (form_id, field_id, field_value) VALUES (?, ?, ?)`,
        [transId, fieldIds['body'], reason]
      );
    }

    // Commit transaction
    await connection.commit();
    connection.release();

    return res.json({
      success: true,
      message: `Referral inserted successfully. Transaction ID: ${transId}`,
      transactionId: transId,
    });
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('Database error:', error);
    return res.status(500).json({
      error: `Database error: ${error.message}`,
    });
  }
});

export { router as referralRouter };

