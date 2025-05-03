import { pingQueue } from "./queue";
import { TaskModel, type ITask } from "../models/user.model";


export const restoreJobs = async () => {
    try {
        const tasks = await TaskModel.find()
        const jobs = tasks.map((task:ITask)=> {
            pingQueue.add('ping-queue', {
                url: task.url,
                userId: task.user,
                taskId: task._id,
                max: task.max,
                failedCount: 0,
                webhook: task.webHook
            }, {
                repeat: {
                    every: task.interval * 60 * 1000,
                    jobId: `task-${task._id}`
                }
            })
            .catch(err => {
                console.error(`Failed to add job for ${task.url}:`, err);
            })
        })
        await Promise.all(jobs)
    } catch (error) {
        console.log("Error restoring jobs:", error);
    }
}