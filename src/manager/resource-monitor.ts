import { Namespace } from '@/utils/config';
import { type PodData, coreV1Api, k8sMetrics } from '@/utils/k8s';

export class ResourceMonitor {
  private static instance: ResourceMonitor | null = null;
  private podData: Map<string, PodData> = new Map();

  private cronJob: NodeJS.Timeout | null = null;

  constructor(interval: number = 1_000 * 0.25) {
    this.cronJob = setInterval(async () => {
      const allServerPod = await coreV1Api.listNamespacedPod({
        namespace: Namespace,
        labelSelector: 'app=minecraft-server',
      });

      allServerPod.items.forEach((pod) => {
        const name = pod.metadata!.name!;
        const allocatedCpu =
          pod.spec?.containers?.[0]!.resources?.requests?.cpu || '0';
        const allocatedMemory =
          pod.spec?.containers?.[0]!.resources?.requests?.memory || '0';
        if (this.podData.has(name)) {
          return;
        } else {
          this.podData.set(name, {
            name,
            allocatedCpu,
            allocatedMemory,
            cpu: '0',
            memory: '0',
          });
        }
      });

      const currentPodsMetrics = await k8sMetrics.getPodMetrics(Namespace);
      currentPodsMetrics.items.forEach((podMetric) => {
        const name = podMetric.metadata!.name!;
        const cpu = podMetric.containers?.[0]!.usage?.cpu || '0';
        const memory = podMetric.containers?.[0]!.usage?.memory || '0';
        if (this.podData.has(name)) {
          const existingData = this.podData.get(name)!;
          this.podData.set(name, {
            ...existingData,
            cpu,
            memory,
          });
        }
      });
    }, interval);
  }

  public static getInstance(interval?: number) {
    if (!this.instance) {
      this.instance = new ResourceMonitor(interval);
    }
    return this.instance;
  }

  public getPodData() {
    return Array.from(this.podData.values());
  }

  public getPodDataByName(name: string) {
    return this.podData.get(name);
  }

  public clean() {
    this.podData.clear();
    clearInterval(this.cronJob!);
    ResourceMonitor.instance = null;
  }
}
