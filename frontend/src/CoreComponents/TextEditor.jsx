"use client"

import { useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import {
  Bold,
  Italic,
  List,
  LinkIcon,
  Send,
  Paperclip,
  ChevronDown,
  X,
  EllipsisVertical, FileUp, Database, Check, Loader2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import api from "@/lib/api"
import { useMyContext } from "@/Context/AppContext"

const EmailComposer = () => {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [htmlOutput, setHtmlOutput] = useState("")
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isSending, setIsSending] = useState(false);
  const { admin_id } = useMyContext();
  const [toArray, setToArray] = useState([]); 

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setHtmlOutput(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  })

  const handleSend = async () => {
    setIsSending(true);
    setStatus({ message: '', type: '' });
    try {
      const formData = {
        emails: toArray,
        subject: subject,
        body: htmlOutput,
      }

      const res = await api.post(`/send_mails/${admin_id}`, formData)
      if (res.status === 202) {
        setStatus({
          message: 'Successfully sent mail!',
          type: 'success'
        });
        setTo('');
        setSubject('');
        setHtmlOutput('');
      }
    } catch (error) {
      console.error('Error sending mail:', error);
      setStatus({
        message: error.response?.data?.message || 'Unable to send mail. Please try again later.',
        type: 'error'
      });
    } finally {
      setIsSending(false);
    }
  };


  // Function to fetch emails from database
  const fetchEmailsFromDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/get_mails/${admin_id}`);
      const x = response.data
      setToArray(x)
    }catch (err){
      console.log(err)
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

      const email_list = emailString
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);
      setToArray(email_list);
    

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
  
    <div className="w-full max-w-4xl mx-auto rounded-lg border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-semibold">New Mail</h1>
      
      </div>

      {/* Email Fields */}
      <div className="border-b">
        {/* To */}

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


        {/* Subject */}
        <div className="flex items-center px-6 py-3">
          <label className="w-16 text-sm text-muted-foreground">
            Subject
          </label>
          <Input
            type="text"
            placeholder="Enter subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-6 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={cn(editor?.isActive("bold") && "bg-accent")}
        >
          <Bold className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={cn(editor?.isActive("italic") && "bg-accent")}
        >
          <Italic className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            editor?.chain().focus().toggleBulletList().run()
          }
          className={cn(editor?.isActive("bulletList") && "bg-accent")}
        >
          <List className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const url = window.prompt("Enter URL")
            if (url) {
              editor?.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={cn(editor?.isActive("link") && "bg-accent")}
        >
          <LinkIcon className="size-4" />
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        <Button variant="ghost" size="icon-sm">
          <Paperclip className="size-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="min-h-[300px]">
        <EditorContent
          editor={editor}
          className="h-full [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:text-foreground"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-6 py-4">
        <Button
          onClick={handleSend}
          disabled={isSending}
        >
          {isSending ? 'Sending...' : 'Send Email'}
        </Button>


        {status.message && (
          <div className={`mt-4 p-3 rounded ${status.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
            {status.message}
          </div>
        )}
      </div>
    </div>

)
}

export default EmailComposer
