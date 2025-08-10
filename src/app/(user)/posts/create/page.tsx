'use client'
import useSwr from 'swr';
import * as React from 'react';
import { useState } from 'react';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';

import MediaUpload from '@/components/features/MediaUpload';
import CaptionsCard from '@/components/features/CaptionsCard'
import AccountsCard from '@/components/features/AccountsCard'

import { SocialAccount } from '@prisma/client';
import { Button } from '@/components/ui/button';
import SchedulePostModal from '@/components/modals/SchedulePostModal';

import { ScheduleData } from '@/types/scheduled-data';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface SocialPlatform {
  id: string
  name: string
  icon: React.ElementType
  wordLimit: number
}

const socialMediaPlatforms: SocialPlatform[] = [
  { id: "FACEBOOK", name: "Facebook", icon: Facebook, wordLimit: 63206 },
  { id: "INSTAGRAM", name: "Instagram", icon: Instagram, wordLimit: 2200 },
  { id: "LINKEDIN", name: "LinkedIn", icon: Linkedin, wordLimit: 3000 },
  { id: "TWITTER", name: "Twitter", icon: Twitter, wordLimit: 280 },
]

export default function CreatePostPage() {
  const { data } = useSwr('/api/accounts', fetcher);

  const [schedule, setSchedule] = useState<ScheduleData>({
    startDate: new Date(),
    startTime: '12:00',
    frequency: 'daily',
    customExpression: '',
  });
  const [platformCaptions, setPlatformCaptions] = useState<{ [key: string]: string }>(() => {
    const initialCaptions: { [key: string]: string } = {}
      socialMediaPlatforms.forEach((platform) => {
        initialCaptions[platform.id] = ""
      })
      return initialCaptions
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files)
    console.log('Uploaded files:', files)
  }

  const selectedPlatforms = data?.data
    .filter((account: SocialAccount) => selectedAccounts.includes(account.id))
    .map((account: SocialAccount) => account.platform);

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      
      // Add files to FormData
      uploadedFiles.forEach((file) => {
        formData.append(`files`, file);
      });
      
      // Add other data as JSON strings
      formData.append('schedule', JSON.stringify(schedule));
      formData.append('accounts', JSON.stringify(selectedAccounts));
      formData.append('captions', JSON.stringify(platformCaptions));

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Post created successfully:', data);

      toast.success("Post Created Successfully");
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error("Failed to create post");
    }
  }
  return (
    <>
      <div className='flex items-center justify-between mb-4'>
        <h1 className="text-3xl font-bold">Create New Post</h1>

        <div className='flex gap-2'>
          <SchedulePostModal 
            onSubmit={handleSubmit}
            schedule={schedule}
            setSchedule={setSchedule}
          />
          <Button variant={'default'} size="lg">
            Publish Now
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <MediaUpload onFilesChange={handleFilesChange} />

          <AccountsCard 
            accounts={data?.data || []}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
          />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <CaptionsCard 
            selectedPlatforms={selectedPlatforms}
            platformCaptions={platformCaptions}
            setPlatformCaptions={setPlatformCaptions}
          />
        </div>
      </div>
    </>
  )
}