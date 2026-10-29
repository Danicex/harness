import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users, ClockFading } from 'lucide-react';
import ViewTask from './viewTask';
import Viewblog from './viewblog';
import AttendanceScanner from './AttendantScanner';

const AllWrapper = () => {
  const [activeTab, setActiveTab] = useState('first');

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Switch between sections using the tabs below.</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="first" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Task</span>
          </TabsTrigger>
          <TabsTrigger value="second" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
          <TabsTrigger value="third" className="gap-2">
            <ClockFading className="h-4 w-4" />
            <span className="hidden sm:inline">Clock In</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="first" className="mt-0">
          <ViewTask />
        </TabsContent>
        <TabsContent value="second" className="mt-0">
          <Viewblog />
        </TabsContent>
        <TabsContent value="third" className="mt-0">
          <AttendanceScanner />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AllWrapper;