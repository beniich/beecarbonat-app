const prisma = require('../config/database');

/**
 * Simule les capteurs IoT en générant des données en temps réel
 * pour la température, humidité, énergie, vibration
 */
let cachedSensors = null;
let lastSensorsFetch = 0;
let persistCounter = 0;

const startIoTSimulation = (io) => {
  setInterval(async () => {
    try {
      const now = Date.now();
      
      // Refresh sensors list from DB once every 60 seconds
      if (!cachedSensors || now - lastSensorsFetch > 60000) {
        try {
          cachedSensors = await prisma.sensor.findMany({ take: 20 });
          lastSensorsFetch = now;
        } catch (dbErr) {
          // If DB query fails, fallback to existing cache or mock sensors
          if (!cachedSensors) {
            cachedSensors = [
              { id: 'mock-temp-1', type: 'temperature', value: 21.5, unit: '°C' },
              { id: 'mock-hum-1', type: 'humidity', value: 45.0, unit: '%' },
              { id: 'mock-nrg-1', type: 'energy', value: 12.4, unit: 'kWh' },
              { id: 'mock-vib-1', type: 'vibration', value: 1.2, unit: 'mm/s' }
            ];
          }
        }
      }

      if (!cachedSensors || cachedSensors.length === 0) return;

      persistCounter++;
      const shouldPersist = persistCounter % 6 === 0; // Persist to DB once every 30 seconds

      for (const sensor of cachedSensors) {
        // Génération de valeurs réalistes selon le type
        let newValue = sensor.value;
        switch (sensor.type) {
          case 'temperature':
            newValue = 18 + Math.random() * 8; // 18-26°C
            break;
          case 'humidity':
            newValue = 40 + Math.random() * 20; // 40-60%
            break;
          case 'energy':
            newValue = Math.random() * 50; // 0-50 kWh
            break;
          case 'vibration':
            newValue = Math.random() * 10; // 0-10 mm/s
            break;
          default:
            newValue = (sensor.value || 20) + (Math.random() - 0.5) * 2;
        }
        sensor.value = newValue;

        // Émettre l'événement en temps réel aux clients connectés
        io.emit('sensor:reading', {
          sensorId: sensor.id,
          type: sensor.type,
          value: Math.round(newValue * 100) / 100,
          unit: sensor.unit || 'unit',
          timestamp: new Date().toISOString()
        });

        // Dashboard update
        io.emit('dashboard:update', {
          type: 'sensor',
          timestamp: new Date().toISOString(),
          data: { sensorId: sensor.id, value: newValue, type: sensor.type }
        });

        // Persist occasional readings only for real DB IDs
        if (shouldPersist && !sensor.id.startsWith('mock-')) {
          prisma.sensor.update({
            where: { id: sensor.id },
            data: { value: newValue }
          }).catch(() => {});
        }
      }
    } catch (error) {
      // Graceful error logging
    }
  }, 5000); // Toutes les 5 secondes
};

module.exports = { startIoTSimulation };
