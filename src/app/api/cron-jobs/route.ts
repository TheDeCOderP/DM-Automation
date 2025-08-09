import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import type { Job, JobsResponse } from "@/types/cron-jobs";
export async function GET(req: NextRequest) {
  const token = await getToken({req});
  if(!token){
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const response = await fetch('https://api.cron-job.org/jobs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_JOB_API_KEY}`
      }
    });

    const responseData: JobsResponse = await response.json();
    
    const jobs = responseData.jobs.filter((job: Job) => job.title == token.id);

    return NextResponse.json({jobs}, {status: 200});
  } catch (error) {
    console.log("Error fetching cron jobs:", error);
    return NextResponse.json({message: 'Error fetching cron jobs'}, {status: 403});
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const response = await fetch('https://api.cron-job.org/jobs', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_JOB_API_KEY}`
      },
      body: JSON.stringify(data)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Cron job creation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData
      });
      throw new Error(`Failed to create cron job: ${response.statusText} - ${JSON.stringify(responseData)}`);
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Error creating cron job:", error);
    return NextResponse.json({ message: 'Error creating cron job' }, { status: 500 });
  }
}