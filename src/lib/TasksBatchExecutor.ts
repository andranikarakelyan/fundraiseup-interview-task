export class TasksBatchExecutor<ArgType> {
  private __batch_handler: BatchHandler<ArgType>;
  private __queue: ArgType[];
  private __timer: NodeJS.Timer | null;
  public CHUNK_SIZE = 1000;

  public constructor(batch_handler: BatchHandler<ArgType>) {
    this.__batch_handler = batch_handler;
    this.__queue = [];
    this.__timer = null;
  }

  public addTasks(args: ArgType[]) {
    if (!this.__timer) {
      throw new Error("You need to start");
    }
    this.__queue.push(...args);
    if (this.__queue.length >= this.CHUNK_SIZE) {
      while (this.__queue.length >= this.CHUNK_SIZE) {
        this.__execTasks();
      }
      this.stop();
      this.start();
    }
  }

  public start(): this {
    if (this.__timer) {
      throw new Error("Already started");
    }

    this.__timer = setInterval(this.__execTasks.bind(this), 1000);
    return this;
  }

  public stop(): this {
    if (this.__timer) {
      clearInterval(this.__timer);
      this.__timer = null;
    } else {
      throw new Error("Not started");
    }
    return this;
  }

  private __execTasks() {
    if (this.__queue.length === 0) {
      return;
    }
    this.__batch_handler(this.__queue.splice(0, this.CHUNK_SIZE)).catch(
      (err) => {
        console.error("Error during batch exec tasks", err);
      }
    );
  }
}

export type BatchHandler<ArgType> = (args: ArgType[]) => Promise<unknown>;
