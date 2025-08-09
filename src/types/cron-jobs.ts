export interface JobSchedule {
  timezone: string;
  expiresAt: number;
  hours: number[];
  mdays: number[];
  minutes: number[];
  months: number[];
  wdays: number[];
}

export interface Job {
  jobId: number;
  enabled: boolean;
  title: string;
  saveResponses: boolean;
  url: string;
  lastStatus: number;
  lastDuration: number;
  lastExecution: number;
  nextExecution: number;
  type: number;
  requestTimeout: number;
  redirectSuccess: boolean;
  folderId: number;
  schedule: JobSchedule;
  requestMethod: number;
}

export interface JobsResponse {
  jobs: Job[];
  someFailed: boolean;
}
