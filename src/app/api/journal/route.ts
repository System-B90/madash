export const dynamic = "force-dynamic";

import { NextRequest } from 'next/server';
import { ApiSuccess, catchHandler } from '../../../api-server/common';
import { Journal, Task } from '../../../api-shared/journal';

// Placeholder for database abstraction
// Assume db is a Prisma-like client or abstracted DB layer
// const db = ...;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      throw new Error('Date parameter is required');
    }

    const today = new Date().toISOString().split('T')[0];
    const isReadOnly = date < today;

    // Fetch journal from DB
    // const journal = await db.journal.findUnique({ where: { date }, include: { tasks: true } });
    // Placeholder: simulate fetching
    const journal: Journal | null = null; // Replace with actual DB call

    let result: Journal;
    if (!journal) {
      result = {
        id: '',
        date,
        customName: '',
        tasks: [],
        isReadOnly,
      };
    } else {
      result = { ...(journal as Journal), isReadOnly };
    }

    return ApiSuccess(result);
  } catch (e) {
    return catchHandler(request, e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<Journal> = await request.json();

    if (!body.date) {
      throw new Error('Date is required');
    }

    const today = new Date().toISOString().split('T')[0];
    if (body.date < today) {
      throw new Error('Cannot modify past journals');
    }

    // Upsert journal
    // const updatedJournal = await db.journal.upsert({
    //   where: { date: body.date },
    //   update: {
    //     customName: body.customName,
    //     tasks: {
    //       upsert: body.tasks?.map(task => ({
    //         where: { id: task.id },
    //         update: {
    //           isCompleted: task.isCompleted,
    //           completedAtTimestamp: task.isCompleted ? new Date() : null,
    //         },
    //         create: task,
    //       })),
    //     },
    //   },
    //   create: {
    //     date: body.date,
    //     customName: body.customName || '',
    //     tasks: {
    //       create: body.tasks || [],
    //     },
    //   },
    //   include: { tasks: true },
    // });

    // Placeholder: simulate upsert
    const updatedJournal: Journal = {
      id: body.id || 'new-id',
      date: body.date,
      customName: body.customName || '',
      tasks: body.tasks?.map(task => ({
        ...task,
        completedAtTimestamp: task.isCompleted ? new Date().toISOString() : undefined,
      })) || [],
      isReadOnly: false,
    };

    return ApiSuccess(updatedJournal);
  } catch (e) {
    return catchHandler(request, e);
  }
}