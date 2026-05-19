import React from 'react';
import SensorAnomalyTimeline from '../components/SensorAnomalyTimeline';
import MachineSensorHeatmap from '../components/MachineSensorHeatmap';
import AnomalyReportPDF from '../components/AnomalyReportPDF';
import DetectionRulesEditor from '../components/DetectionRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <header>
        <h1 style={{ margin: '0 0 0.25rem 0' }}>Industrial Views</h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Operational anomaly insights and detection-rule configuration for the IoT fleet.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        <SensorAnomalyTimeline />
        <MachineSensorHeatmap />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        <AnomalyReportPDF />
        <DetectionRulesEditor />
      </section>
    </div>
  );
}
