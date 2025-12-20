export class TaskQueue {
  private queue: (() => Promise<void>)[] = [];
  private activeCount = 0;
  private concurrency: number;

  constructor(concurrency: number = 1) {
    this.concurrency = concurrency;
  }

  addTask(task: () => Promise<void>) {
    this.queue.push(task);
    this.processNext();
  }

  private processNext() {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    try {
      const result = task();
      // 使用 Promise.resolve 確保即使 task 返回非 Promise 值也能正常處理
      Promise.resolve(result)
        .catch((err) => {
          console.error('Task execution failed:', err);
        })
        .finally(() => {
          this.activeCount--;
          this.processNext();
        });
    } catch (err) {
      // 捕捉同步錯誤 (Synchronous errors)
      console.error('Task execution failed synchronously:', err);
      this.activeCount--;
      this.processNext();
    }

    this.processNext();
  }
}
