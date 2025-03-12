// runCodeUtils.ts
import vm from "vm";
import { PythonShell } from "python-shell";

export async function runJSCode(snippet: string): Promise<string> {
  try {
    // We'll use vm's runInNewContext as a simplistic "sandbox"
    // This is not a fully secure sandbox, for advanced usage consider vm2
    const sandbox = {};
    const script = new vm.Script(snippet);
    const context = vm.createContext(sandbox);
    const result = script.runInContext(context);
    // If result is a Promise, await it
    if (result instanceof Promise) {
      const awaited = await result;
      return String(awaited);
    }
    return String(result);
  } catch (err: any) {
    return `JS Error: ${String(err)}`;
  }
}

export async function runPythonCode(snippet: string): Promise<string> {
    return new Promise<string>((resolve) => {
      // We'll create a temporary script, or pass snippet to python shell
      // For demonstration, we pass it as "exec code" but be aware of security
      const shell = new PythonShell("", {
        mode: "text",
        pythonOptions: ["-c"], // run code from command line
      });
  
      let output = "";
      let errorOutput = "";
  
      // Actually, python-shell doesn't pass code that way easily, we might do:
      shell.send(snippet);
  
      shell.on("message", (message) => {
        output += message + "\n";
      });
  
      shell.on("stderr", (stderr) => {
        errorOutput += stderr + "\n";
      });
  
      shell.on("close", (exitCode: any) => {
        if (exitCode === 0 && !errorOutput) {
          resolve(output.trim());
        } else {
          resolve(`Python error (exit code ${exitCode}):\n${errorOutput}`);
        }
      });
    });
  }
  