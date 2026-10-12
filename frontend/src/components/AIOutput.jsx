import React from 'react';
import AIReport from './AIReport';

export default function AIOutput({ content, loading }) {
  if (content === null || content === undefined) return loading ? <AIReport loading /> : null;
  return <AIReport response={content} loading={loading} title="AI analysis results" />;
}
