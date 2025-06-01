import { Job, Queue, Worker } from 'npm:bullmq@5'
import { Redis } from 'npm:ioredis@5'
import { JOB_TYPES, JobPayload, QUEUE_NAMES, ResultPayload } from './types.ts'

export class QueueClient {
    private redis: Redis
    private queue: Queue

    constructor(redisUrl: string) {
        this.redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
        })

        this.queue = new Queue(QUEUE_NAMES.BROWSER_REQUESTS, {
            connection: this.redis,
            defaultJobOptions: {
                removeOnComplete: 10,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            },
        })
    }

    async addBrowserJob(
        payload: JobPayload,
    ): Promise<Job<JobPayload, ResultPayload>> {
        return await this.queue.add(JOB_TYPES.CREATE_BROWSER, payload, {
            jobId: payload.sessionId,
            delay: 0,
        })
    }

    async addTerminationJob(sessionId: string): Promise<Job> {
        return await this.queue.add(
            JOB_TYPES.TERMINATE_BROWSER,
            { sessionId },
            {
                priority: 10, // Higher priority for termination jobs
            },
        )
    }

    async getJobStatus(sessionId: string): Promise<ResultPayload | null> {
        const job = await this.queue.getJob(sessionId)
        if (!job) return null

        const result: ResultPayload = {
            sessionId,
            status: this.mapJobState(await job.getState()),
            ...job.returnvalue,
        }

        if (job.failedReason) {
            result.error = job.failedReason
        }

        return result
    }

    createWorker(
        processor: (job: Job<JobPayload, ResultPayload>) => Promise<ResultPayload>,
    ) {
        return new Worker(QUEUE_NAMES.BROWSER_REQUESTS, processor, {
            connection: this.redis,
            concurrency: 5,
            removeOnComplete: { count: 10 },
            removeOnFail: { count: 50 },
        })
    }

    private mapJobState(state: string): ResultPayload['status'] {
        switch (state) {
            case 'waiting':
            case 'delayed':
                return 'pending'
            case 'active':
                return 'running'
            case 'completed':
                return 'completed'
            case 'failed':
                return 'failed'
            default:
                return 'pending'
        }
    }

    async close(): Promise<void> {
        await this.queue.close()
        await this.redis.quit()
    }
}
