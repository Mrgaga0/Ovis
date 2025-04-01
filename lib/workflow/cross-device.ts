import { SyncManager } from '../sync'
import { ProcessingOptions, defaultLiteOptions } from '../processing/lite-options'

export interface DeviceInfo {
  id: string
  type: 'mobile' | 'tablet' | 'desktop'
  platform: string
  capabilities: {
    storage: number
    memory: number
    network: 'offline' | '2g' | '3g' | '4g' | '5g' | 'wifi'
  }
}

export interface WorkflowState {
  currentDevice: DeviceInfo
  lastSyncTime: Date
  activeProcesses: string[]
  pendingTasks: string[]
}

export class CrossDeviceWorkflow {
  private syncManager: SyncManager
  private state: WorkflowState
  private options: ProcessingOptions

  constructor(deviceInfo: DeviceInfo) {
    this.syncManager = new SyncManager(deviceInfo.id)
    this.state = {
      currentDevice: deviceInfo,
      lastSyncTime: new Date(),
      activeProcesses: [],
      pendingTasks: []
    }
    this.options = this.determineProcessingOptions(deviceInfo)
  }

  private determineProcessingOptions(device: DeviceInfo): ProcessingOptions {
    if (device.type === 'mobile') {
      return defaultLiteOptions
    }

    return {
      quality: 'high',
      offline: false,
      batchSize: 50,
      cacheEnabled: true,
      compressionLevel: 3
    }
  }

  async startProcess(processId: string): Promise<void> {
    this.state.activeProcesses.push(processId)
    await this.syncManager.queueOperation('create', 'Process', {
      id: processId,
      deviceId: this.state.currentDevice.id,
      startTime: new Date()
    })
  }

  async completeProcess(processId: string): Promise<void> {
    this.state.activeProcesses = this.state.activeProcesses.filter(
      id => id !== processId
    )
    await this.syncManager.queueOperation('update', 'Process', {
      id: processId,
      completedAt: new Date()
    })
  }

  async queueTask(taskId: string): Promise<void> {
    this.state.pendingTasks.push(taskId)
    await this.syncManager.queueOperation('create', 'Task', {
      id: taskId,
      deviceId: this.state.currentDevice.id,
      status: 'pending'
    })
  }

  async syncState(): Promise<void> {
    const result = await this.syncManager.sync()
    if (result.success) {
      this.state.lastSyncTime = new Date()
    }
  }

  getDeviceInfo(): DeviceInfo {
    return this.state.currentDevice
  }

  getActiveProcesses(): string[] {
    return this.state.activeProcesses
  }

  getPendingTasks(): string[] {
    return this.state.pendingTasks
  }

  getLastSyncTime(): Date {
    return this.state.lastSyncTime
  }
} 