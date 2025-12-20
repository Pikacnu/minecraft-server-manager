import { Namespace, NFSPath, NFSServer } from '@/utils/config';
import type { ServicesDeployments } from '@/utils/type';
import { isDevelopment } from '@/utils/config';

const CLAIM_STORAGE_SIZE = '200Gi';

export const SystemRequiredDeployments: ServicesDeployments = {
  Namespace: [
    {
      body: {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: Namespace,
        },
      },
    },
  ],
  // PVCs: isDevelopment
  // ? [
  // {
  // namespace: Namespace,
  // body: {
  // apiVersion: 'v1',
  // kind: 'PersistentVolumeClaim',
  // metadata: {
  // name: 'manager-pvc',
  // namespace: Namespace,
  // labels: {
  // app: 'manager',
  // category: 'manager',
  // },
  // },
  // spec: {
  // accessModes: ['ReadWriteOnce'],
  // resources: {
  // requests: {
  // storage: CLAIM_STORAGE_SIZE,
  // },
  // },
  // storageClassName: 'manager-storage-class',
  // },
  // },
  // },
  // ]
  // : [],
  // PVs: isDevelopment
  // ? [
  // {
  // body: {
  // apiVersion: 'v1',
  // kind: 'PersistentVolume',
  // metadata: {
  // name: 'manager-pv',
  // labels: {
  // app: 'manager',
  // category: 'manager',
  // },
  // },
  // spec: {
  // capacity: {
  // storage: CLAIM_STORAGE_SIZE,
  // },
  // accessModes: ['ReadWriteOnce'],
  // persistentVolumeReclaimPolicy: 'Retain',
  // storageClassName: 'manager-storage-class',
  // nfs: {
  // path: NFSPath,
  // server: NFSServer,
  // },
  // },
  // },
  // },
  // ]
  // : [],
};
