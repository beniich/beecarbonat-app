// RosterFlow Optimization Engine

// Detect double bookings in scheduling.
// Shifts are passed as a flat Int32Array to avoid complex object serialization overhead.
// Format per shift: [shiftId, startHour, endHour, personnelId]
export function detect_conflicts(shiftsFlat: Int32Array): Int32Array {
  let conflicts = new Array<i32>();

  // Compare every shift with every other shift
  for (let i = 0; i < shiftsFlat.length; i += 4) {
    let shiftIdA = shiftsFlat[i];
    let startA = shiftsFlat[i + 1];
    let endA = shiftsFlat[i + 2];
    let personA = shiftsFlat[i + 3];

    for (let j = i + 4; j < shiftsFlat.length; j += 4) {
      let shiftIdB = shiftsFlat[j];
      let startB = shiftsFlat[j + 1];
      let endB = shiftsFlat[j + 2];
      let personB = shiftsFlat[j + 3];

      // If same person
      if (personA == personB) {
        // Temporal overlap condition: A starts before B ends AND A ends after B starts
        if (startA < endB && endA > startB) {
          if (!conflicts.includes(shiftIdA)) conflicts.push(shiftIdA);
          if (!conflicts.includes(shiftIdB)) conflicts.push(shiftIdB);
        }
      }
    }
  }

  // Convert internal Array to Int32Array for native JS boundary crossing
  let result = new Int32Array(conflicts.length);
  for (let i = 0; i < conflicts.length; i++) {
    result[i] = conflicts[i];
  }
  return result;
}
