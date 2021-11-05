import { Logger, WoxQueryProcessor } from "wox-ts"
import { AudioHandler } from "./AudioHandler";

const logger = new Logger(true);
const handler = new AudioHandler({ logger })
const processor = new WoxQueryProcessor(handler, logger);
processor.processFromCommandLineAsync(process.argv).then(() => { });