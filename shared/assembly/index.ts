// The entry file of your WebAssembly module.

// A simple utility function to prove WebAssembly loading works
export function add_wasm(a: i32, b: i32): i32 {
  return a + b;
}

// A more domain-specific mock engine function
export function calculate_priority_wasm(
  baseScore: i32,
  urgencyLevel: i32,
): i32 {
  // Simple algorithm: base score + (urgency * 10)
  return baseScore + urgencyLevel * 10;
}

// Export the RosterFlow optimization engine
export * from "./rosterflow";
