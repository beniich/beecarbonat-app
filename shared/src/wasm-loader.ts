/**
 * Manual WebAssembly Loader for ReclamTrack
 *
 * This loader avoids top-level await and provides the necessary 'env' imports
 * (like abort) that AssemblyScript expects, making it compatible with
 * Vercel and Next.js flight loaders.
 */

export interface WasmExports {
  memory: WebAssembly.Memory;
  add_wasm: (a: number, b: number) => number;
  calculate_priority_wasm: (baseScore: number, urgencyLevel: number) => number;
  detect_conflicts: (shiftsFlat: Int32Array) => Int32Array;
  // Internal AS helpers if needed
  __new?: (size: number, id: number) => number;
  __pin?: (ptr: number) => number;
  __unpin?: (ptr: number) => number;
}

/**
 * Initializes the WebAssembly module from a given URL or Buffer.
 */
export async function initWasm(wasmInput: string | URL | Response | Request | ArrayBufferView | ArrayBuffer): Promise<WasmExports> {
  const imports = {
    env: {
      abort(message: number, fileName: number, line: number, column: number) {
        console.error(`Wasm aborted at ${line}:${column}`);
      },
    },
  };

  let instance: WebAssembly.Instance;

  if (wasmInput instanceof Response || wasmInput instanceof Promise) {
     const result: any = await WebAssembly.instantiateStreaming(wasmInput as any, imports);
     instance = result.instance || result;
  } else if (wasmInput instanceof ArrayBuffer || wasmInput instanceof Uint8Array) {
     const result: any = await WebAssembly.instantiate(wasmInput, imports);
     instance = result.instance || result;
  } else {
     // For Next.js/Webpack, we usually pass the result of a dynamic import or fetch
     const response = await fetch(wasmInput as any);
     const result: any = await WebAssembly.instantiateStreaming(response, imports);
     instance = result.instance || result;
  }

  const exports = instance.exports as unknown as WasmExports;

  // We wrap the exports to handle AssemblyScript's specific array handling if necessary.
  // For the current POC, we'll keep it simple or add the manual lifting/lowering logic here.

  return exports;
}
