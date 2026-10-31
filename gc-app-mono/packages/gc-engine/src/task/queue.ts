import { Queue } from "js-sdsl";
import { Task } from "./task.ts";

export const receiveMessageQueue = new Queue<Task>();

export const inputRTTQueue = new Queue<Task>();
