const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS energy_records CASCADE;
      DROP TABLE IF EXISTS health_scores CASCADE;
      DROP TABLE IF EXISTS predictive_maintenance CASCADE;
      DROP TABLE IF EXISTS root_cause_analyses CASCADE;
      DROP TABLE IF EXISTS alerts CASCADE;
      DROP TABLE IF EXISTS maintenance_schedules CASCADE;
      DROP TABLE IF EXISTS anomalies CASCADE;
      DROP TABLE IF EXISTS equipment CASCADE;
      DROP TABLE IF EXISTS sensors CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('Creating tables...');

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE sensors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        min_value DECIMAL,
        max_value DECIMAL,
        status VARCHAR(50) DEFAULT 'active',
        installed_date DATE,
        last_reading DECIMAL,
        last_reading_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE equipment (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        manufacturer VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(255),
        status VARCHAR(50) DEFAULT 'operational',
        install_date DATE,
        last_maintenance DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE anomalies (
        id SERIAL PRIMARY KEY,
        sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        description TEXT,
        detected_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'open',
        ai_analysis TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE maintenance_schedules (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        description TEXT,
        scheduled_date DATE NOT NULL,
        completed_date DATE,
        status VARCHAR(50) DEFAULT 'scheduled',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE alerts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        source VARCHAR(255),
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
        sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active',
        acknowledged_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        acknowledged_at TIMESTAMP
      );

      CREATE TABLE root_cause_analyses (
        id SERIAL PRIMARY KEY,
        anomaly_id INTEGER REFERENCES anomalies(id) ON DELETE SET NULL,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        root_cause TEXT,
        ai_analysis TEXT,
        confidence DECIMAL,
        recommendations TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE health_scores (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        score DECIMAL NOT NULL,
        factors JSONB,
        ai_analysis TEXT,
        recommendations TEXT,
        calculated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE energy_records (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        consumption_kwh DECIMAL NOT NULL,
        cost DECIMAL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        ai_optimization TEXT,
        savings_potential DECIMAL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE predictive_maintenance (
        id SERIAL PRIMARY KEY,
        equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
        predicted_failure_date DATE,
        failure_type VARCHAR(255),
        probability DECIMAL,
        ai_analysis TEXT,
        recommended_action TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    await client.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@iotplatform.com', $1, 'Admin User', 'admin'),
      ('operator1@iotplatform.com', $1, 'John Martinez', 'operator'),
      ('engineer1@iotplatform.com', $1, 'Sarah Chen', 'engineer'),
      ('manager1@iotplatform.com', $1, 'Mike Thompson', 'manager');
    `, [hashedPassword]);

    console.log('Seeding sensors...');
    await client.query(`
      INSERT INTO sensors (name, type, location, unit, min_value, max_value, status, installed_date, last_reading, last_reading_at) VALUES
      ('TEMP-001', 'temperature', 'Plant A - Assembly Line 1', '°C', 15, 85, 'active', '2023-01-15', 72.5, NOW() - INTERVAL '5 minutes'),
      ('TEMP-002', 'temperature', 'Plant A - Boiler Room', '°C', 50, 200, 'active', '2023-02-10', 165.3, NOW() - INTERVAL '3 minutes'),
      ('TEMP-003', 'temperature', 'Plant B - Cold Storage', '°C', -30, 5, 'active', '2023-03-20', -18.7, NOW() - INTERVAL '1 minute'),
      ('VIB-001', 'vibration', 'Plant A - CNC Machine Bay', 'mm/s', 0, 25, 'active', '2023-01-20', 4.2, NOW() - INTERVAL '2 minutes'),
      ('VIB-002', 'vibration', 'Plant A - Compressor Room', 'mm/s', 0, 30, 'active', '2023-04-05', 12.8, NOW() - INTERVAL '4 minutes'),
      ('VIB-003', 'vibration', 'Plant B - Turbine Hall', 'mm/s', 0, 20, 'warning', '2023-05-12', 18.5, NOW() - INTERVAL '1 minute'),
      ('PRESS-001', 'pressure', 'Plant A - Hydraulic System', 'bar', 0, 350, 'active', '2023-02-28', 210.0, NOW() - INTERVAL '6 minutes'),
      ('PRESS-002', 'pressure', 'Plant A - Steam Line', 'bar', 0, 15, 'active', '2023-03-15', 8.7, NOW() - INTERVAL '2 minutes'),
      ('PRESS-003', 'pressure', 'Plant B - Pneumatic System', 'bar', 0, 10, 'active', '2023-06-01', 6.2, NOW() - INTERVAL '3 minutes'),
      ('FLOW-001', 'flow', 'Plant A - Cooling System', 'L/min', 0, 500, 'active', '2023-04-10', 325.4, NOW() - INTERVAL '5 minutes'),
      ('FLOW-002', 'flow', 'Plant B - Water Treatment', 'L/min', 0, 1000, 'active', '2023-05-20', 780.2, NOW() - INTERVAL '2 minutes'),
      ('HUMID-001', 'humidity', 'Plant A - Paint Shop', '%', 30, 80, 'active', '2023-03-01', 55.0, NOW() - INTERVAL '4 minutes'),
      ('CURR-001', 'current', 'Plant A - Motor Drive 1', 'A', 0, 100, 'active', '2023-01-10', 42.3, NOW() - INTERVAL '1 minute'),
      ('CURR-002', 'current', 'Plant B - Motor Drive 2', 'A', 0, 200, 'warning', '2023-02-15', 185.6, NOW() - INTERVAL '3 minutes'),
      ('RPM-001', 'speed', 'Plant A - Conveyor Belt 1', 'RPM', 0, 3000, 'active', '2023-06-15', 1450.0, NOW() - INTERVAL '2 minutes'),
      ('RPM-002', 'speed', 'Plant B - Centrifuge', 'RPM', 0, 5000, 'active', '2023-07-01', 3200.0, NOW() - INTERVAL '5 minutes'),
      ('LEVEL-001', 'level', 'Plant A - Tank Farm', '%', 0, 100, 'active', '2023-04-20', 67.8, NOW() - INTERVAL '6 minutes'),
      ('GAS-001', 'gas', 'Plant A - Welding Area', 'ppm', 0, 500, 'active', '2023-05-10', 12.5, NOW() - INTERVAL '3 minutes')
    `);

    console.log('Seeding equipment...');
    await client.query(`
      INSERT INTO equipment (name, type, location, manufacturer, model, serial_number, status, install_date, last_maintenance) VALUES
      ('CNC Mill Alpha', 'CNC Machine', 'Plant A - Machine Bay 1', 'Haas Automation', 'VF-2SS', 'HAAS-2023-001', 'operational', '2022-06-15', '2025-12-01'),
      ('CNC Mill Beta', 'CNC Machine', 'Plant A - Machine Bay 2', 'Haas Automation', 'VF-4SS', 'HAAS-2023-002', 'operational', '2022-08-20', '2025-11-15'),
      ('Industrial Compressor 1', 'Compressor', 'Plant A - Compressor Room', 'Atlas Copco', 'GA 90+', 'AC-2022-501', 'operational', '2021-03-10', '2025-10-20'),
      ('Industrial Compressor 2', 'Compressor', 'Plant B - Compressor Room', 'Ingersoll Rand', 'R-Series 110', 'IR-2022-302', 'maintenance', '2021-05-22', '2025-09-15'),
      ('Hydraulic Press A', 'Press', 'Plant A - Forming Area', 'Schuler Group', 'MSP 400', 'SG-2021-101', 'operational', '2020-11-05', '2025-11-30'),
      ('Conveyor Belt Line 1', 'Conveyor', 'Plant A - Assembly Line 1', 'Siemens', 'SIMATIC S7-1500', 'SIE-2023-401', 'operational', '2023-01-20', '2025-12-10'),
      ('Conveyor Belt Line 2', 'Conveyor', 'Plant B - Packaging', 'Bosch Rexroth', 'VarioFlow Plus', 'BR-2023-201', 'operational', '2023-03-15', '2025-11-25'),
      ('Centrifugal Pump 1', 'Pump', 'Plant A - Cooling System', 'Grundfos', 'CR 95-2', 'GF-2022-601', 'operational', '2022-02-14', '2025-10-05'),
      ('Centrifugal Pump 2', 'Pump', 'Plant B - Water Treatment', 'KSB', 'Etanorm G 100-315', 'KSB-2022-701', 'warning', '2022-04-18', '2025-08-20'),
      ('Steam Boiler Main', 'Boiler', 'Plant A - Boiler Room', 'Cleaver-Brooks', 'CBLE-700', 'CB-2020-801', 'operational', '2020-09-01', '2025-12-05'),
      ('Gas Turbine GT-1', 'Turbine', 'Plant B - Power Generation', 'GE Power', 'LM2500', 'GE-2021-901', 'operational', '2021-07-12', '2025-11-10'),
      ('Robotic Arm R1', 'Robot', 'Plant A - Welding Station', 'FANUC', 'M-20iA', 'FAN-2023-101', 'operational', '2023-02-28', '2025-12-15'),
      ('Robotic Arm R2', 'Robot', 'Plant A - Assembly Station', 'ABB', 'IRB 6700', 'ABB-2023-201', 'operational', '2023-04-10', '2025-11-20'),
      ('Industrial Chiller', 'Chiller', 'Plant A - HVAC', 'Carrier', '30XA', 'CAR-2021-301', 'operational', '2021-10-15', '2025-10-30'),
      ('Paint Spray System', 'Spray System', 'Plant A - Paint Shop', 'Graco', 'ProMix PD2K', 'GR-2022-401', 'operational', '2022-06-01', '2025-11-05'),
      ('Electric Motor M1', 'Motor', 'Plant A - Drive System', 'Siemens', 'SIMOTICS GP', 'SIE-2022-501', 'warning', '2022-01-10', '2025-09-01')
    `);

    console.log('Seeding anomalies...');
    await client.query(`
      INSERT INTO anomalies (sensor_id, equipment_id, type, severity, description, detected_at, status, ai_analysis) VALUES
      (1, 1, 'temperature_spike', 'high', 'Temperature exceeded normal operating range on CNC Mill Alpha spindle bearing', NOW() - INTERVAL '2 hours', 'open', NULL),
      (4, 1, 'vibration_anomaly', 'critical', 'Excessive vibration detected on CNC Mill Alpha X-axis drive', NOW() - INTERVAL '1 hour', 'open', NULL),
      (5, 3, 'vibration_anomaly', 'medium', 'Unusual vibration pattern in compressor intake valve', NOW() - INTERVAL '3 hours', 'investigating', 'Initial analysis suggests worn intake valve seating.'),
      (7, 5, 'pressure_drop', 'high', 'Hydraulic pressure dropped below minimum threshold on Press A', NOW() - INTERVAL '30 minutes', 'open', NULL),
      (2, 10, 'temperature_spike', 'critical', 'Boiler temperature rapidly increasing beyond safe limit', NOW() - INTERVAL '15 minutes', 'open', NULL),
      (10, 8, 'flow_rate_anomaly', 'medium', 'Cooling system flow rate 15% below expected value', NOW() - INTERVAL '4 hours', 'investigating', NULL),
      (13, 16, 'current_overload', 'high', 'Motor M1 drawing 20% more current than rated capacity', NOW() - INTERVAL '45 minutes', 'open', NULL),
      (6, 11, 'vibration_anomaly', 'critical', 'Turbine shaft vibration exceeding alarm threshold', NOW() - INTERVAL '20 minutes', 'open', NULL),
      (14, 9, 'current_overload', 'medium', 'Pump motor current fluctuating abnormally', NOW() - INTERVAL '5 hours', 'resolved', 'Impeller imbalance caused by debris accumulation. Cleaned and rebalanced.'),
      (15, 6, 'speed_deviation', 'low', 'Conveyor belt speed variance of 3% detected', NOW() - INTERVAL '6 hours', 'resolved', NULL),
      (12, 15, 'humidity_anomaly', 'medium', 'Paint shop humidity outside acceptable range', NOW() - INTERVAL '2 hours', 'open', NULL),
      (3, NULL, 'temperature_anomaly', 'low', 'Cold storage temperature fluctuation of 2°C detected', NOW() - INTERVAL '8 hours', 'resolved', 'Minor refrigerant charge adjustment resolved the issue.'),
      (8, 10, 'pressure_fluctuation', 'medium', 'Steam line pressure oscillating between 7-10 bar', NOW() - INTERVAL '1 hour', 'investigating', NULL),
      (18, NULL, 'gas_detection', 'high', 'Elevated CO levels detected near welding area', NOW() - INTERVAL '10 minutes', 'open', NULL),
      (17, NULL, 'level_anomaly', 'low', 'Tank level sensor showing erratic readings', NOW() - INTERVAL '12 hours', 'resolved', 'Sensor recalibration resolved the issue.'),
      (11, 9, 'flow_rate_anomaly', 'high', 'Water treatment flow rate dropped 30% suddenly', NOW() - INTERVAL '40 minutes', 'open', NULL)
    `);

    console.log('Seeding maintenance schedules...');
    await client.query(`
      INSERT INTO maintenance_schedules (equipment_id, type, description, scheduled_date, completed_date, status, priority, assigned_to, notes) VALUES
      (1, 'preventive', 'Quarterly spindle bearing inspection and lubrication', '2026-04-01', NULL, 'scheduled', 'medium', 'John Martinez', 'Check bearing play and grease levels'),
      (2, 'preventive', 'Annual tool changer maintenance', '2026-03-25', NULL, 'scheduled', 'medium', 'John Martinez', 'Inspect tool pockets, clean ATC arm'),
      (3, 'corrective', 'Replace intake valve assembly', '2026-03-22', NULL, 'scheduled', 'high', 'Sarah Chen', 'Valve showing signs of wear per vibration analysis'),
      (4, 'corrective', 'Compressor motor rebuild', '2026-03-20', NULL, 'in_progress', 'critical', 'Sarah Chen', 'Motor overheating issue, full rebuild required'),
      (5, 'preventive', 'Hydraulic fluid replacement and system flush', '2026-04-10', NULL, 'scheduled', 'medium', 'Mike Thompson', 'Use ISO VG 46 hydraulic oil'),
      (6, 'preventive', 'Conveyor belt tension adjustment and alignment', '2026-03-28', NULL, 'scheduled', 'low', 'John Martinez', 'Routine quarterly adjustment'),
      (7, 'preventive', 'Belt replacement and roller inspection', '2026-04-15', NULL, 'scheduled', 'medium', 'Mike Thompson', 'Order replacement belt in advance'),
      (8, 'corrective', 'Pump seal replacement', '2026-03-18', '2026-03-18', 'completed', 'high', 'Sarah Chen', 'Minor leak detected at mechanical seal'),
      (9, 'corrective', 'Impeller cleaning and rebalancing', '2026-03-15', '2026-03-15', 'completed', 'medium', 'John Martinez', 'Debris accumulation causing vibration'),
      (10, 'preventive', 'Annual boiler inspection and tube cleaning', '2026-04-05', NULL, 'scheduled', 'high', 'Sarah Chen', 'Mandatory annual safety inspection'),
      (11, 'preventive', 'Turbine blade inspection', '2026-05-01', NULL, 'scheduled', 'high', 'Mike Thompson', 'Borescope inspection of first stage blades'),
      (12, 'preventive', 'Robot calibration and joint inspection', '2026-03-30', NULL, 'scheduled', 'medium', 'John Martinez', 'Check all 6 axes for backlash'),
      (13, 'preventive', 'Robot end-effector maintenance', '2026-04-08', NULL, 'scheduled', 'low', 'John Martinez', 'Inspect welding tip, replace if needed'),
      (14, 'preventive', 'Chiller refrigerant level check and filter change', '2026-03-26', NULL, 'scheduled', 'medium', 'Sarah Chen', 'Check R-134a levels'),
      (15, 'corrective', 'Spray nozzle replacement', '2026-03-19', '2026-03-19', 'completed', 'high', 'Mike Thompson', 'Clogged nozzles causing uneven coating'),
      (16, 'corrective', 'Motor bearing replacement', '2026-03-23', NULL, 'scheduled', 'critical', 'Sarah Chen', 'Bearing noise detected during inspection')
    `);

    console.log('Seeding alerts...');
    await client.query(`
      INSERT INTO alerts (type, severity, message, source, equipment_id, sensor_id, status, acknowledged_by, created_at, acknowledged_at) VALUES
      ('threshold_exceeded', 'critical', 'CNC Mill Alpha spindle temperature at 82°C - exceeds 80°C limit', 'TEMP-001', 1, 1, 'active', NULL, NOW() - INTERVAL '2 hours', NULL),
      ('vibration_alarm', 'critical', 'X-axis vibration on CNC Mill Alpha at 22 mm/s - exceeds 20 mm/s alarm', 'VIB-001', 1, 4, 'active', NULL, NOW() - INTERVAL '1 hour', NULL),
      ('pressure_warning', 'high', 'Hydraulic press pressure dropped to 150 bar - below 180 bar minimum', 'PRESS-001', 5, 7, 'active', NULL, NOW() - INTERVAL '30 minutes', NULL),
      ('temperature_alarm', 'critical', 'Boiler temperature at 195°C - approaching 200°C safety limit', 'TEMP-002', 10, 2, 'active', NULL, NOW() - INTERVAL '15 minutes', NULL),
      ('current_overload', 'high', 'Motor M1 drawing 52A - rated for 42A continuous', 'CURR-001', 16, 13, 'active', NULL, NOW() - INTERVAL '45 minutes', NULL),
      ('flow_warning', 'medium', 'Cooling system flow at 276 L/min - 15% below setpoint of 325 L/min', 'FLOW-001', 8, 10, 'acknowledged', 'Sarah Chen', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours'),
      ('vibration_alarm', 'critical', 'Turbine shaft vibration at 18.5 mm/s - exceeds 15 mm/s alarm', 'VIB-003', 11, 6, 'active', NULL, NOW() - INTERVAL '20 minutes', NULL),
      ('gas_detection', 'high', 'CO level at 45 ppm near welding area - exceeds 35 ppm TWA', 'GAS-001', NULL, 18, 'active', NULL, NOW() - INTERVAL '10 minutes', NULL),
      ('maintenance_due', 'medium', 'Compressor 2 motor rebuild overdue by 2 days', 'System', 4, NULL, 'acknowledged', 'John Martinez', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
      ('communication_loss', 'medium', 'Lost communication with level sensor LEVEL-001 for 10 minutes', 'LEVEL-001', NULL, 17, 'resolved', 'Mike Thompson', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '11 hours'),
      ('humidity_warning', 'medium', 'Paint shop humidity at 78% - approaching 80% upper limit', 'HUMID-001', 15, 12, 'active', NULL, NOW() - INTERVAL '2 hours', NULL),
      ('speed_deviation', 'low', 'Conveyor belt speed variance of 3% detected on Line 1', 'RPM-001', 6, 15, 'resolved', 'John Martinez', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours'),
      ('flow_alarm', 'high', 'Water treatment flow dropped 30% from 780 to 546 L/min', 'FLOW-002', 9, 11, 'active', NULL, NOW() - INTERVAL '40 minutes', NULL),
      ('temperature_warning', 'low', 'Cold storage temperature at -16.5°C - slightly above -18°C setpoint', 'TEMP-003', NULL, 3, 'resolved', 'Sarah Chen', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours'),
      ('current_fluctuation', 'medium', 'Pump motor current fluctuating between 160-195A', 'CURR-002', 9, 14, 'acknowledged', 'Sarah Chen', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours'),
      ('system_alert', 'low', 'Scheduled maintenance reminder: Boiler annual inspection due April 5', 'System', 10, NULL, 'active', NULL, NOW() - INTERVAL '1 day', NULL)
    `);

    console.log('Seeding root cause analyses...');
    await client.query(`
      INSERT INTO root_cause_analyses (anomaly_id, equipment_id, title, root_cause, ai_analysis, confidence, recommendations, status) VALUES
      (1, 1, 'CNC Mill Alpha Spindle Overheating', 'Bearing lubrication degradation due to extended runtime without maintenance', NULL, 0.85, 'Replace spindle bearings and update lubrication schedule to every 500 hours', 'confirmed'),
      (2, 1, 'CNC Mill Alpha X-axis Vibration', 'Worn ball screw nut causing backlash and vibration', NULL, 0.78, 'Replace ball screw assembly and perform realignment', 'investigating'),
      (3, 3, 'Compressor Intake Valve Wear', 'Normal wear after 15,000 hours of operation exceeding valve service life', 'Analysis indicates valve seat erosion pattern consistent with normal wear. No contamination detected.', 0.92, 'Replace valve assembly. Consider upgrading to ceramic-coated valves for extended life.', 'confirmed'),
      (4, 5, 'Hydraulic Press Pressure Loss', 'Suspected internal seal failure in main cylinder', NULL, 0.70, 'Inspect main cylinder seals and check hydraulic fluid for contamination', 'investigating'),
      (5, 10, 'Boiler Temperature Excursion', 'Feedwater control valve malfunction causing flow reduction', NULL, 0.65, 'Inspect and calibrate feedwater control valve. Check valve actuator.', 'pending'),
      (6, 8, 'Cooling Pump Flow Reduction', 'Partial impeller blockage from scale buildup', 'Flow reduction correlates with gradual efficiency decline over 3 months. Consistent with scale accumulation pattern.', 0.88, 'Descale pump internals. Install inline strainer. Implement water treatment program.', 'confirmed'),
      (7, 16, 'Motor M1 Current Overload', 'Bearing failure causing increased mechanical friction', NULL, 0.82, 'Replace motor bearings immediately. Check alignment with driven equipment.', 'investigating'),
      (8, 11, 'Turbine Shaft Vibration', 'Possible blade tip erosion causing mass imbalance', NULL, 0.60, 'Perform borescope inspection. If confirmed, schedule blade refurbishment.', 'pending'),
      (9, 9, 'Pump Motor Current Fluctuation', 'Impeller debris accumulation causing intermittent imbalance', 'Root cause confirmed: organic debris lodged between impeller vanes. Cleaning resolved the issue.', 0.95, 'Install fine mesh strainer upstream. Schedule quarterly impeller inspections.', 'confirmed'),
      (10, 6, 'Conveyor Speed Variance', 'Belt tension slightly below specification', 'Minor speed variance within acceptable limits. Belt tension measured at 95% of specification.', 0.90, 'Adjust belt tension during next scheduled maintenance. No immediate action required.', 'confirmed'),
      (11, 15, 'Paint Shop Humidity Excursion', 'HVAC dehumidifier filter partially clogged', NULL, 0.75, 'Replace HVAC filters. Check dehumidifier coil for ice buildup.', 'investigating'),
      (13, 10, 'Steam Line Pressure Oscillation', 'Pressure reducing valve (PRV) hunting due to worn diaphragm', NULL, 0.72, 'Replace PRV diaphragm. Check downstream demand stability.', 'pending'),
      (14, NULL, 'Elevated CO at Welding Station', 'Insufficient local exhaust ventilation capacity', NULL, 0.68, 'Increase LEV airflow. Check duct for blockages. Verify fume extraction hood positioning.', 'investigating'),
      (16, 9, 'Water Treatment Flow Drop', 'Strainer blockage from seasonal biological growth', NULL, 0.80, 'Clean strainer. Implement biocide treatment program.', 'pending'),
      (12, NULL, 'Cold Storage Temperature Fluctuation', 'Low refrigerant charge causing compressor short cycling', 'Temperature cycling pattern matches compressor short cycle profile. Refrigerant leak suspected at service valve.', 0.87, 'Locate and repair refrigerant leak. Recharge system. Verify with 24-hour monitoring.', 'confirmed')
    `);

    console.log('Seeding health scores...');
    await client.query(`
      INSERT INTO health_scores (equipment_id, score, factors, ai_analysis, recommendations, calculated_at) VALUES
      (1, 62.5, '{"vibration": 45, "temperature": 55, "runtime_hours": 70, "maintenance_history": 80}', 'Equipment showing moderate degradation. Spindle bearing and X-axis drive require attention.', 'Prioritize spindle bearing replacement. Schedule ball screw inspection.', NOW() - INTERVAL '1 hour'),
      (2, 88.0, '{"vibration": 92, "temperature": 85, "runtime_hours": 90, "maintenance_history": 85}', 'Equipment in good condition. Minor wear consistent with age.', 'Continue standard maintenance schedule. Next major service at 10,000 hours.', NOW() - INTERVAL '2 hours'),
      (3, 71.0, '{"vibration": 60, "pressure": 75, "runtime_hours": 65, "maintenance_history": 84}', 'Intake valve wear reducing efficiency. Otherwise structurally sound.', 'Replace intake valve assembly within 2 weeks. Monitor discharge temperature.', NOW() - INTERVAL '1 hour'),
      (4, 35.0, '{"vibration": 30, "temperature": 40, "runtime_hours": 25, "maintenance_history": 45}', 'Equipment in poor condition. Motor requires rebuild. Extended downtime expected.', 'Complete motor rebuild before returning to service. Full alignment check required.', NOW() - INTERVAL '3 hours'),
      (5, 68.0, '{"pressure": 55, "vibration": 78, "runtime_hours": 72, "maintenance_history": 67}', 'Hydraulic system showing pressure issues. Seals may need replacement.', 'Inspect cylinder seals. Replace hydraulic fluid and filters.', NOW() - INTERVAL '2 hours'),
      (6, 92.0, '{"speed": 95, "vibration": 90, "runtime_hours": 93, "maintenance_history": 90}', 'Conveyor system in excellent condition. Minor belt tension adjustment needed.', 'Adjust belt tension at next scheduled maintenance. No urgent actions.', NOW() - INTERVAL '4 hours'),
      (7, 85.5, '{"speed": 88, "vibration": 82, "runtime_hours": 87, "maintenance_history": 85}', 'Good overall condition. Normal wear patterns observed.', 'Schedule belt replacement within 6 months as preventive measure.', NOW() - INTERVAL '3 hours'),
      (8, 76.0, '{"flow_rate": 70, "vibration": 80, "runtime_hours": 75, "maintenance_history": 79}', 'Flow reduction indicates partial blockage. Pump otherwise healthy.', 'Descale pump internals. Verify impeller condition after cleaning.', NOW() - INTERVAL '1 hour'),
      (9, 55.0, '{"flow_rate": 45, "vibration": 50, "current": 55, "maintenance_history": 70}', 'Multiple issues detected. Flow reduction and current anomalies suggest mechanical wear.', 'Comprehensive inspection required. Check impeller, bearings, and seals.', NOW() - INTERVAL '2 hours'),
      (10, 78.0, '{"temperature": 72, "pressure": 80, "efficiency": 82, "maintenance_history": 78}', 'Boiler operating within limits but temperature control needs calibration.', 'Calibrate feedwater control valve. Schedule tube inspection.', NOW() - INTERVAL '1 hour'),
      (11, 65.0, '{"vibration": 50, "temperature": 70, "runtime_hours": 68, "maintenance_history": 72}', 'Turbine vibration concerning. Blade inspection recommended.', 'Schedule borescope inspection. Monitor vibration trends closely.', NOW() - INTERVAL '30 minutes'),
      (12, 90.5, '{"precision": 92, "vibration": 88, "runtime_hours": 91, "maintenance_history": 91}', 'Robot in excellent working condition. Calibration within specification.', 'Continue regular calibration schedule. Next major service at 20,000 hours.', NOW() - INTERVAL '5 hours'),
      (13, 89.0, '{"precision": 90, "vibration": 87, "runtime_hours": 89, "maintenance_history": 90}', 'Robot performing well. All joints within tolerance.', 'Standard maintenance adequate. Monitor joint 4 backlash trend.', NOW() - INTERVAL '4 hours'),
      (14, 82.0, '{"temperature": 85, "pressure": 80, "efficiency": 83, "maintenance_history": 80}', 'Chiller operating efficiently. Refrigerant levels adequate.', 'Filter change due. Check condenser coil cleanliness.', NOW() - INTERVAL '6 hours'),
      (15, 74.0, '{"spray_quality": 70, "pressure": 78, "maintenance_history": 74}', 'Spray quality declining slightly. New nozzles recently installed.', 'Monitor spray pattern after nozzle replacement. Verify fluid viscosity.', NOW() - INTERVAL '3 hours'),
      (16, 42.0, '{"vibration": 35, "current": 30, "temperature": 50, "maintenance_history": 53}', 'Motor showing significant bearing wear. Immediate attention required.', 'Replace bearings urgently. Check shaft runout and alignment.', NOW() - INTERVAL '1 hour')
    `);

    console.log('Seeding energy records...');
    await client.query(`
      INSERT INTO energy_records (equipment_id, consumption_kwh, cost, period_start, period_end, ai_optimization, savings_potential) VALUES
      (1, 285.5, 34.26, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (2, 310.2, 37.22, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (3, 892.0, 107.04, '2026-03-13 00:00:00', '2026-03-20 00:00:00', 'Compressor running at 85% load average. Variable speed drive could reduce consumption by 15% during low-demand periods.', 133.80),
      (4, 0, 0, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (5, 445.8, 53.50, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (6, 125.3, 15.04, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (7, 118.7, 14.24, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (8, 210.5, 25.26, '2026-03-13 00:00:00', '2026-03-20 00:00:00', 'Pump efficiency has dropped 8% from baseline. Cleaning impeller could restore 15 kWh/week savings.', 15.0),
      (9, 245.0, 29.40, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (10, 2850.0, 342.00, '2026-03-13 00:00:00', '2026-03-20 00:00:00', 'Boiler running at 78% efficiency. Tube cleaning could improve to 85%, saving approximately 285 kWh/week.', 285.0),
      (11, 4200.0, 504.00, '2026-03-13 00:00:00', '2026-03-20 00:00:00', 'Turbine heat rate above design by 3%. Blade refurbishment could save 126 kWh/week.', 126.0),
      (12, 45.2, 5.42, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (13, 52.8, 6.34, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (14, 1680.0, 201.60, '2026-03-13 00:00:00', '2026-03-20 00:00:00', 'Chiller COP at 4.2, down from design 5.0. Condenser cleaning and refrigerant charge check could save 20% energy.', 336.0),
      (15, 78.5, 9.42, '2026-03-13 00:00:00', '2026-03-20 00:00:00', NULL, NULL),
      (16, 520.0, 62.40, '2026-03-13 00:00:00', '2026-03-20 00:00:00', 'Motor running 20% above rated current due to bearing friction. Bearing replacement could save 104 kWh/week.', 104.0)
    `);

    console.log('Seeding predictive maintenance...');
    await client.query(`
      INSERT INTO predictive_maintenance (equipment_id, predicted_failure_date, failure_type, probability, ai_analysis, recommended_action, status) VALUES
      (1, '2026-04-15', 'Spindle bearing failure', 0.82, 'Vibration trend analysis shows bearing defect frequency increasing at 2% per week. Estimated 3-4 weeks until functional failure.', 'Replace spindle bearings within 2 weeks. Order parts immediately.', 'pending'),
      (1, '2026-05-01', 'Ball screw wear failure', 0.68, 'Positional accuracy degrading. Backlash measurement trending upward.', 'Schedule ball screw replacement during next planned downtime.', 'pending'),
      (3, '2026-04-05', 'Intake valve failure', 0.88, 'Valve leakage rate doubling every 10 days based on pressure differential analysis.', 'Replace intake valve assembly within 2 weeks.', 'acknowledged'),
      (4, '2026-03-25', 'Motor winding failure', 0.91, 'Insulation resistance declining rapidly. Motor temperature trending above normal.', 'Complete motor rebuild in progress. Do not restart without full testing.', 'in_progress'),
      (5, '2026-05-20', 'Hydraulic seal failure', 0.72, 'Gradual pressure loss pattern consistent with seal degradation curve.', 'Plan seal replacement during Q2 maintenance window.', 'pending'),
      (8, '2026-06-01', 'Impeller erosion', 0.55, 'Efficiency decline rate suggests impeller wear. 3-month window before critical.', 'Schedule impeller inspection and replacement if wear exceeds 10%.', 'pending'),
      (9, '2026-04-10', 'Bearing failure', 0.78, 'Current fluctuation pattern matches bearing defect signature.', 'Replace pump bearings and check shaft alignment.', 'pending'),
      (10, '2026-07-01', 'Tube fouling critical', 0.65, 'Heat transfer coefficient declining 1% monthly. Will reach critical level in ~3 months.', 'Schedule tube cleaning during annual inspection.', 'pending'),
      (11, '2026-06-15', 'Blade tip erosion', 0.70, 'Vibration spectrum shows emerging blade pass frequency harmonics.', 'Borescope inspection needed. Plan blade refurbishment if erosion >15%.', 'pending'),
      (14, '2026-08-01', 'Compressor wear', 0.45, 'Minor COP degradation. Slow progression indicates 4-5 months before service needed.', 'Monitor monthly. Schedule service during summer maintenance window.', 'monitoring'),
      (16, '2026-03-28', 'Bearing seizure', 0.93, 'Bearing temperature and current draw indicate imminent failure within 1-2 weeks.', 'URGENT: Replace bearings immediately. Risk of shaft damage if operated.', 'pending'),
      (6, '2026-09-01', 'Belt wear', 0.40, 'Belt elongation trending. Current rate suggests 5-6 months of remaining life.', 'Order replacement belt. Schedule change during Q3 planned outage.', 'monitoring'),
      (12, '2026-12-01', 'Joint reducer wear', 0.30, 'Minor backlash increase in Joint 4. Very slow progression.', 'Monitor during regular calibration checks. No immediate concern.', 'monitoring'),
      (15, '2026-05-01', 'Pump seal wear', 0.62, 'Fluid pressure at nozzle showing gradual decline consistent with pump seal wear.', 'Inspect pump seals during next maintenance. Have spare seals on hand.', 'pending'),
      (7, '2026-08-15', 'Roller bearing wear', 0.48, 'Slight increase in roller vibration. Projected to reach alert level in 5 months.', 'Include roller bearing inspection in next quarterly maintenance.', 'monitoring')
    `);

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
