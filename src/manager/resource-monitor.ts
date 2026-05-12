import { Namespace } from '@/utils/config';
import { type PodData, coreV1Api, k8sMetrics } from '@/utils/k8s';

export class ResourceMonitor {
  private static instance: ResourceMonitor | null = null;
  private podData: Map<string, PodData> = new Map();

  private cronJob: NodeJS.Timeout | null = null;

  constructor(interval: number = 1_000 * 2) {
    this.cronJob = setInterval(async () => {
      try {
        const allServerPod = await coreV1Api.listNamespacedPod({
          namespace: Namespace,
          labelSelector: 'app=minecraft-server',
        });
        const nextPodData: Map<string, PodData> = new Map();
        const podNameToServerName: Map<string, string> = new Map();

        allServerPod.items.forEach((pod) => {
          const podName = pod.metadata?.name;
          const serverName = pod.metadata?.labels?.name || podName;
          if (!podName || !serverName) {
            return;
          }
          const allocatedCpu =
            pod.spec?.containers?.[0]?.resources?.requests?.cpu || '0';
          const allocatedMemory =
            pod.spec?.containers?.[0]?.resources?.requests?.memory || '0';
          podNameToServerName.set(podName, serverName);
          nextPodData.set(serverName, {
            name: serverName,
            allocatedCpu,
            allocatedMemory,
            cpu: this.podData.get(serverName)?.cpu || '0',
            memory: this.podData.get(serverName)?.memory || '0',
          });
        });

        const currentPodsMetrics = await k8sMetrics.getPodMetrics(Namespace);
        currentPodsMetrics.items.forEach((podMetric) => {
          const podName = podMetric.metadata?.name;
          if (!podName) {
            return;
          }
          const serverName =
            podNameToServerName.get(podName) ||
            podMetric.metadata?.labels?.name ||
            podName;
          const existingData = nextPodData.get(serverName);
          if (!existingData) {
            return;
          }
          const cpu = podMetric.containers?.[0]?.usage?.cpu || '0';
          const memory = podMetric.containers?.[0]?.usage?.memory || '0';
          nextPodData.set(serverName, {
            ...existingData,
            cpu,
            memory,
          });
        });
        this.podData = nextPodData;
      } catch (error) {
        console.error('Failed to update resource monitor data:', error);
      }
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
