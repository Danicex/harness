import React, { useState, useRef } from 'react';
import { EllipsisVertical, FileUp, Database, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const EmailRecipientInput = () => {
  const [to, setTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // Function to fetch emails from database
  const fetchEmailsFromDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/emails', {
        params: {
          // Add any necessary parameters like user ID, filters, etc.
          limit: 100, // Limit to prevent overwhelming the UI
        }
      });
      
      if (response.data.success) {
        // Remove duplicates from the fetched emails
        const uniqueEmails = removeDuplicateEmails(response.data.emails);
        setSelectedEmails(uniqueEmails);
        
        // Join emails with comma and update the input
        const emailString = uniqueEmails.join(', ');
        setTo(emailString);
        
        toast({
          title: 'Success',
          description: `Loaded ${uniqueEmails.length} unique emails from database`,
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch emails');
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch emails from database',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle CSV file upload
  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is CSV
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Read CSV file
      const emails = await parseCSVFile(file);
      
      // Remove duplicates
      const uniqueEmails = removeDuplicateEmails(emails);
      setSelectedEmails(uniqueEmails);
      
      // Update input field with emails
      const emailString = uniqueEmails.join(', ');
      setTo(emailString);
      
      toast({
        title: 'Success',
        description: `Loaded ${uniqueEmails.length} unique emails from CSV`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to parse CSV file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Function to parse CSV file and extract emails
  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const emails = extractEmailsFromCSV(text);
          resolve(emails);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  // Function to extract emails from CSV text
  const extractEmailsFromCSV = (csvText) => {
    const emails = [];
    const lines = csvText.split('\n');
    
    lines.forEach((line, index) => {
      // Skip header row if needed
      if (index === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('e-mail'))) {
        return;
      }
      
      // Split by comma or semicolon
      const columns = line.split(/[,;]/);
      
      columns.forEach(column => {
        // Extract email using regex pattern
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = column.match(emailPattern);
        
        if (matches) {
          emails.push(...matches);
        }
      });
    });
    
    return emails;
  };

  // Function to remove duplicate emails
  const removeDuplicateEmails = (emails) => {
    const uniqueEmails = [];
    const seen = new Set();
    
    emails.forEach(email => {
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail && !seen.has(trimmedEmail)) {
        seen.add(trimmedEmail);
        uniqueEmails.push(trimmedEmail);
      }
    });
    
    return uniqueEmails;
  };

  // Function to manually trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex items-center border-b px-6 py-3">
      <label className="w-16 text-sm text-muted-foreground">To</label>
      <Input
        type="email"
        placeholder="recipients@example.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="border-0 shadow-none focus-visible:ring-0 flex-1"
        multiple // Allows multiple emails separated by commas
      />
      
      {/* Hidden file input for CSV upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCSVUpload}
        accept=".csv"
        className="hidden"
      />
      
      {/* Dropdown menu for options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <EllipsisVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={triggerFileInput}
            className="cursor-pointer"
          >
            <FileUp className="mr-2 h-4 w-4" />
            <span>Upload CSV file</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={fetchEmailsFromDatabase}
            className="cursor-pointer"
          >
            <Database className="mr-2 h-4 w-4" />
            <span>Get emails from database</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Display count of selected emails */}
      {selectedEmails.length > 0 && (
        <div className="ml-2 text-xs text-muted-foreground">
          {selectedEmails.length} recipients
        </div>
      )}
    </div>
  );
};

export default EmailRecipientInput;