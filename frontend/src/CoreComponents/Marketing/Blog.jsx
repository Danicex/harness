import React, { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { CreateBlogCard} from '@/CRUD/BlogCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Share2, Eye, EyeOff, MoreVertical, Search, Trash } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import DataPagination from '@/components/DataPagination'

const ITEMS_PER_PAGE = 9

export default function Blog() {
  const [blogData, setBlogData] = useState([])
  const [newBlog, setNewBlog] = useState(false)
  const [editBlog, setEditBlog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reload, setReload] = useState(false)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isSharing, setIsSharing] = useState(false)

  // Safe filtered with proper property names
  const filtered = useMemo(
    () => (blogData || []).filter((item) =>
      item?.title?.toLowerCase().includes(search?.toLowerCase() || "")
    ),
    [blogData, search]
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    getBlog()
  }, [reload])

  const getBlog = async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await api.get(`/blog/get_blogs`)
      // Ensure we set the data properly (adjust based on your API response structure)
      setBlogData(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (blog) => {
    alert(`Downloading ${blog.title}...`)
  }

  const handleShare = async (blog) => {
    setIsSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: blog.title,
          text: blog.description || `Check out this blog: ${blog.title}`,
          url: `${window.location.origin}/blog/${blog.id}`,
        })
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/blog/${blog.id}`)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
    } finally {
      setIsSharing(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/blog/delete_blog/${id}`)
      setBlogData((prev) => prev.filter((blog) => blog.id !== id))
    } catch (err) {
      console.error('Error deleting blog:', err)
    }
  }
  return (
    <div>
      <div className="header mb-4">
        <Button onClick={() => setNewBlog(!newBlog)} className=" text-white">
          Create Blog
        </Button>
      </div>
      
      <div className="relative py-5 max-w-[600px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search blogs..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      {newBlog && <CreateBlogCard setNewBlog={setNewBlog} onSuccess={getBlog} />}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-4 p-4 border rounded-md">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center p-4">
          <p className="text-red-500 mb-2">Unable to get blog data</p>
          <Button onClick={getBlog} variant="outline">Try again</Button>
        </div>
      ) : filtered.length > 0 ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map((blog) => (
            <Card key={blog.id} className="overflow-hidden flex flex-col h-full">
              <div className="relative h-48 w-full">
                {blog.video_url ? (
                  <video
                    src={blog.video_url}
                    className="object-cover w-full h-full"
                    controls
                  />
                ) : (
                  <img
                    src={blog.image_url}
                    alt={blog.title}
                    className="object-cover w-full h-full"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={blog.category === 'public' ? 'default' : 'secondary'}>
                    {blog.category === 'public' ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {blog.category === 'public' ? 'Public' : 'Private'}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="flex-grow p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg line-clamp-2 flex-1 mr-2">{blog.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    
                      <DropdownMenuItem onClick={() => handleShare(blog)}>
                        <Share2 className="h-4 w-4 mr-2" /> Share
                      </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleDelete(blog.id)}>
                        <Trash className="h-4 w-4 mr-2 text-red-400" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {blog.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{blog.description}</p>
                )}
              </CardContent>
              
              <CardFooter className="p-4 pt-0 mt-auto">
                <div className="flex justify-between items-center w-full">
                  <div className="text-xs text-muted-foreground">
                    {blog.created_at && (
                      <span>Posted {formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })}</span>
                    )}
                  </div>
                 
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
        <DataPagination
          page={page}
          totalItems={filtered.length}
          perPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
        />
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {blogData.length === 0 ? "No blogs found. Create your first blog!" : "No blogs match your search."}
        </div>
      )}
    </div>
  )
}