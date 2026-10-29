
import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { 
  Download, 
  Share2, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  User, 
  Check, 
  Copy,
  PlayCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from "sonner";
import axios from 'axios';
const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL
axios.defaults.baseURL = API_ENDPOINT;

const Viewblog = () => {
  const [blogData, setBlogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const admin_id = localStorage.getItem("admin_id")
  
  const getBlog = async () => {
    setLoading(true);
    setError(false);
    console.log(localStorage.getItem('token'))
    try {
      const response = await axios.get(`/blog/public_blog/${admin_id}`);
      setBlogData(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBlog();
  }, []);

  // Feature: Download Blog as a Text File
  const handleDownload = (blog, e) => {
    if (e) e.stopPropagation();
    try {
      const fileContent = `Title: ${blog.title}\nCategory: ${blog.category || 'public'}\nDate: ${blog.created_at || ''}\n\n${blog.description || ''}`;
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${blog.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Success", { description: "Blog downloaded successfully!" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to download blog." });
    }
  };

  // Feature: Share Blog via Web Share API or Clipboard Fallback
  const handleShare = async (blog, e) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/blog/${blog.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.title,
          text: blog.description,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed silently
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedId(blog.id);
        toast("Copied!", { description: "Blog link copied to clipboard." });
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to copy link." });
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Loading State UI
  if (loading) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading articles...</p>
      </div>
    );
  }

  // 2. Error State UI
  if (error) {
    return (
      <div className="mx-auto my-8 max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h3 className="mt-4 text-lg font-semibold text-destructive">Failed to load blogs</h3>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong while retrieving the blog data. Please try again later.</p>
        <Button onClick={getBlog} variant="outline" className="mt-4">Retry Now</Button>
      </div>
    );
  }

  // 3. Empty State UI
  if (blogData.length === 0) {
    return (
      <div className="my-12 text-center">
        <p className="text-muted-foreground">No articles published yet.</p>
      </div>
    );
  }

  // 4. Main Grid View
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Latest Articles</h1>
        <p className="text-muted-foreground">Stay updated with our newest publications.</p>
      </header>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogData.map((blog) => (
          <Card 
            key={blog.id} 
            className="flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer"
            onClick={() => setSelectedBlog(blog)}
          >
            <div>
              {/* Optional Image Support */}
              {blog.image_url && (
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <img 
                    src={blog.image_url} 
                    alt={blog.title} 
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              )}
              
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {blog.category && (
                    <Badge variant="secondary" className="capitalize">{blog.category}</Badge>
                  )}
                  {blog.created_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(blog.created_at)}</span>
                    </div>
                  )}
                </div>
                <CardTitle className="line-clamp-2 text-xl hover:text-primary transition-colors">
                  {blog.title}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {blog.description || "No description available."}
                </p>
                {blog.admin_id && (
                  <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <User className="h-3 w-3" />
                    <span>Author #{blog.admin_id}</span>
                  </div>
                )}
              </CardContent>
            </div>

            {/* Interactive Feature Row */}
            <CardFooter className="border-t bg-muted/30 px-6 py-3 flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => handleDownload(blog, e)}
                title="Download text file"
              >
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => handleShare(blog, e)}
                title="Share article"
              >
                {copiedId === blog.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span className="sr-only">Share</span>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Full Article Dialog */}
      <Dialog open={!!selectedBlog} onOpenChange={(open) => !open && setSelectedBlog(null)}>
        {selectedBlog && (
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {selectedBlog.category && (
                  <Badge variant="secondary" className="capitalize">{selectedBlog.category}</Badge>
                )}
                {selectedBlog.created_at && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(selectedBlog.created_at)}</span>
                  </div>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold leading-tight">
                {selectedBlog.title}
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Article Reference ID: #{selectedBlog.id}
                {selectedBlog.admin_id && ` • Author #${selectedBlog.admin_id}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {selectedBlog.image_url && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img 
                    src={selectedBlog.image_url} 
                    alt={selectedBlog.title} 
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {selectedBlog.video_url && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    Video Content
                  </h4>
                  <video 
                    src={selectedBlog.video_url} 
                    controls 
                    className="w-full rounded-lg border border-border"
                  />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Article Content</h4>
                <p className="text-muted-foreground bg-muted/40 rounded-lg p-4 border border-border/50 whitespace-pre-wrap leading-relaxed text-sm">
                  {selectedBlog.description || "No content available for this article."}
                </p>
              </div>

              {selectedBlog.admin_id && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                  <User className="h-4 w-4" />
                  <span>Published by Author #{selectedBlog.admin_id}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownload(selectedBlog)}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleShare(selectedBlog)}
                  className="gap-1.5"
                >
                  {copiedId === selectedBlog.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copiedId === selectedBlog.id ? 'Copied' : 'Share'}
                </Button>
              </div>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm"
                onClick={() => setSelectedBlog(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Viewblog;