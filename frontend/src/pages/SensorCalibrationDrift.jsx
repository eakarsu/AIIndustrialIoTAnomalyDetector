import React, { useEffect, useState } from 'react';

export default function SensorCalibrationDrift() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/sensor-calibration-drift').then((r) => r.json()).then(setData).catch(() => {});
  }, []);
  return (
    <div>
      <h1>Sensor Calibration Drift Monitor</h1>
      <p>Detects sensors whose offset drift can create false anomaly signals.</p>
      {data?.sensors?.map((s) => <section key={s.sensor} className="card"><h2>{s.sensor}</h2><p>{s.status} - drift {s.drift_score}</p></section>)}
    </div>
  );
}
