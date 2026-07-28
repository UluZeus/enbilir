export function parseRunWithHeartbeatArguments(argv) {
  const separator = argv.indexOf("--");
  if (separator < 0 || separator === argv.length - 1) {
    throw new Error("Usage: run-with-heartbeat --job <key> [--log-dir <dir>] -- <command> [args...]");
  }

  const options = argv.slice(0, separator);
  const command = argv.slice(separator + 1);
  const allowedOptions = new Set(["--job", "--log-dir", "--max-bytes"]);
  const seenOptions = new Set();
  for (let index = 0; index < options.length; index += 2) {
    const option = options[index];
    const value = options[index + 1];
    if (!allowedOptions.has(option) || seenOptions.has(option) || value === undefined || value.startsWith("--")) {
      throw new Error(`Invalid run-with-heartbeat option: ${option || "(missing)"}.`);
    }
    seenOptions.add(option);
  }

  const valueAfter = (name) => {
    const index = options.indexOf(name);
    return index >= 0 ? options[index + 1] : undefined;
  };
  const jobKey = valueAfter("--job");
  if (!jobKey || !/^[a-z0-9][a-z0-9:_-]{1,63}$/i.test(jobKey)) {
    throw new Error("A safe --job key is required.");
  }

  const maxBytesValue = valueAfter("--max-bytes");
  const maxBytes = maxBytesValue === undefined ? 10 * 1024 * 1024 : Number(maxBytesValue);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("--max-bytes must be a positive safe integer.");
  }
  if (!command[0]?.trim() || command[0] === "--") {
    throw new Error("A child command is required after --.");
  }

  return {
    jobKey,
    logDirectory: valueAfter("--log-dir"),
    maxBytes,
    command: command[0],
    commandArguments: command.slice(1),
  };
}
