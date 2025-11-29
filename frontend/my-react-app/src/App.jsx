import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import ReferralForm from './components/ReferralForm';
import './App.css';
import viteLogo from './assets/vite.svg';
import reactLogo from './assets/react.svg';

// Tooltip component
function KeywordTooltip({ word, children }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <span
        style={{
          textDecoration: 'underline',
          cursor: 'pointer',
          textDecorationColor: '#755760'
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </span>
      {showTooltip && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1a1a1a',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            fontSize: '14px',
            marginBottom: '5px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          testing testing testing 
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1a1a1a'
            }}
          />
        </span>
      )}
    </span>
  );
}

// Component to highlight keywords in text
function HighlightedText({ text }) {
  const keywords = ['cardiologist', 'dermatologist', 'endocrinologist', 'ENT surgeon', 'gastroenterologist', 'general surgeon', 'haematologist', 'neurologist', 'nephrologist', 'oncologist', 'ophthalmologist', 'orthopaedic surgeon', 'paediatrician', 'physiotherapist', 'psychiatrist', 'radiologist', 'respiratory physician', 'rheumatologist', 'urologist', 'vascular surgeon'];
  
  // Create a regex pattern to match all keywords (case-insensitive)
  const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  
  // Split text by keywords while keeping the keywords
  const parts = text.split(pattern);
  
  return (
  <>
    {parts.map((part, index) => {
      const isKeyword = keywords.some(
        keyword => keyword.toLowerCase() === part.toLowerCase()
      );

      if (isKeyword) {
        return (
          <KeywordTooltip key={index} word={part}>
            <span className="keyword">{part}</span>
          </KeywordTooltip>
        );
      }

      return <span key={index}>{part}</span>;
    })}
  </>
);
}

function App() {
  const [count, setCount] = useState(0);

  const transcriptText = `58M with a history of MI 2ya presents with a 1/52 hx of increased awareness of heart beat following a sporting injury to the ribs. Sx remained stable but become more noticeable during periods of anxiety about recurrence of cardiac events. He reports 2 episodes of waking at night due to feeling stressed, but denies chest pain, dyspnoea, peripheral oedema, neurological symptoms, or other systemic features. Given cardiac hx and persistent palpitations, refer to cardiologist.`;

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h1>58M, palpitations</h1>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          Next pt {count}
        </button>
        <p>
          <HighlightedText text={transcriptText} />
        </p>
      </div>

      <p className="read-the-docs">hellow world</p>

      {/* Routes for navigation */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/referral" element={<ReferralForm />} />
      </Routes>
    </>
  );
}

export default App;