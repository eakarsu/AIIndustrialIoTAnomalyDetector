import React from 'react';
import { FiCpu } from 'react-icons/fi';

function parseAIContent(content) {
  if (!content) return [];

  // If it's an object, try to format it
  if (typeof content === 'object') {
    content = JSON.stringify(content, null, 2);
  }

  const text = String(content);
  const sections = [];
  let currentSection = { title: 'Analysis Results', items: [] };

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect section headers (lines ending with : or starting with ## or **)
    if ((line.endsWith(':') && line.length < 80 && !line.includes(',')) ||
        line.startsWith('## ') || line.startsWith('**') && line.endsWith('**')) {
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      const title = line.replace(/^##\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/:$/, '');
      currentSection = { title, items: [] };
    } else {
      // Clean up bullet points and dashes
      const cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
      if (cleaned) {
        currentSection.items.push(cleaned);
      }
    }
  }

  if (currentSection.items.length > 0 || sections.length === 0) {
    sections.push(currentSection);
  }

  return sections;
}

function extractMetrics(text) {
  const metrics = [];
  // Look for percentage patterns
  const pctMatches = text.match(/(\d+(?:\.\d+)?)\s*%/g);
  if (pctMatches) {
    pctMatches.forEach(m => {
      const val = parseFloat(m);
      let level = 'low';
      if (val > 70) level = 'high';
      else if (val > 40) level = 'medium';
      metrics.push({ value: m, level });
    });
  }
  return metrics;
}

function getConfidenceFromText(text) {
  const match = text.match(/confidence[:\s]*(\d+(?:\.\d+)?)\s*%?/i);
  if (match) return parseFloat(match[1]);
  const match2 = text.match(/(\d+(?:\.\d+)?)\s*%\s*confidence/i);
  if (match2) return parseFloat(match2[1]);
  return null;
}

export default function AIOutput({ content, loading }) {
  if (loading) {
    return (
      <div className="ai-output-container">
        <div className="ai-output-header">
          <FiCpu /> AI Analysis
        </div>
        <div className="ai-loading">
          <div className="spinner-ai"></div>
          <p>AI is analyzing data...</p>
        </div>
      </div>
    );
  }

  if (!content) return null;

  const fullText = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
  const sections = parseAIContent(content);
  const confidence = getConfidenceFromText(fullText);

  return (
    <div className="ai-output-container">
      <div className="ai-output-header">
        <FiCpu /> AI Analysis Results
      </div>
      <div className="ai-output-body">
        {confidence !== null && (
          <div className="ai-confidence-bar">
            <div className="bar-label">
              <span>Confidence Level</span>
              <span>{confidence}%</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${confidence}%`,
                  background: confidence > 70 ? 'var(--green)' : confidence > 40 ? 'var(--orange)' : 'var(--red)',
                }}
              />
            </div>
          </div>
        )}

        {sections.map((section, idx) => (
          <div key={idx} className="ai-section">
            <div className="ai-section-title">
              {section.title}
            </div>
            <div className="ai-section-content">
              {section.items.map((item, iIdx) => {
                // Check if it looks like a recommendation
                const isRec = /recommend|suggest|should|consider|action/i.test(item);
                const metrics = extractMetrics(item);

                if (isRec) {
                  return (
                    <div key={iIdx} className="ai-recommendation">
                      <div className="rec-body">{item}</div>
                    </div>
                  );
                }

                return (
                  <div key={iIdx} style={{ marginBottom: '4px' }}>
                    <ul><li>{item}</li></ul>
                    {metrics.length > 0 && (
                      <div>
                        {metrics.map((m, mIdx) => (
                          <span key={mIdx} className={`ai-metric-badge ${m.level}`}>{m.value}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
