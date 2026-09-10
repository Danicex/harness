'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, X } from 'lucide-react';
import api from '@/lib/api';
import { useMyContext } from '@/Context/AppContext';

export function CreateDatasetForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [intents, setIntents] = useState([]);
  const [expandedIntentId, setExpandedIntentId] = useState(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { admin_id } = useMyContext();

  const addIntent = () => {
    const newIntent = {
      id: Date.now().toString(),
      question: '',
      response: '',
      followUpQuestion: '',
      redirect: '',
    };

    setIntents([...intents, newIntent]);
    setExpandedIntentId(newIntent.id);
  };

  const updateIntent = (id, field, value) => {
    setIntents(
      intents.map((intent) =>
        intent.id === id ? { ...intent, [field]: value } : intent
      )
    );
  };

  const removeIntent = (id) => {
    setIntents(intents.filter((intent) => intent.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare the data with all intents
      const formData = {
        title,
        description,
        intents: intents.map(intent => ({
          id: intent.id,
          question: intent.question,
          response: intent.response,
          followUpQuestion: intent.followUpQuestion,
          redirect: intent.redirect,
        }))
      };

      await api.post(`/create_dataset/${admin_id}`, formData);
      
      setStatus('Dataset created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setIntents([]);
      
    } catch (error) {
      setStatus('Failed to create dataset. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
            Create Dataset
          </h1>
          <p className="text-muted-foreground">
            Build AI training data with intents
          </p>
        </div>

        {/* Status Messages */}
        {status && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.includes('success')
              ? 'bg-green-500/10 border border-green-500/20 text-green-700'
              : 'bg-red-500/10 border border-red-500/20 text-red-700'
          }`}>
            {status}
          </div>
        )}

        <form className="space-y-6">
          {/* Dataset Info Section */}
          <Card className="border-border p-6">
            <div className="space-y-5">
              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-foreground font-medium">
                  Dataset Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Customer Support Conversations"
                  required
                  className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-foreground font-medium">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose and context of this dataset..."
                  rows={4}
                  className="mt-2 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          </Card>

          {/* Intents Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Intents</h2>
              <button
                type="button"
                onClick={addIntent}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-primary/90 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Intent
              </button>
            </div>

            {intents.length === 0 ? (
              <Card className="border-border p-8 text-center">
                <p className="text-muted-foreground">
                  No intents added yet. Click "Add Intent" to get started.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {intents.map((intent) => {
                  const isExpanded = expandedIntentId === intent.id;

                  return (
                    <Card
                      key={intent.id}
                      className="border-border overflow-hidden transition-all"
                    >
                      {/* Intent Header */}
                      <div
                        onClick={() =>
                          setExpandedIntentId(isExpanded ? null : intent.id)
                        }
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <div className="flex-1 text-left">
                          <p className="font-medium text-foreground">
                            {intent.question || 'Untitled Intent'}
                          </p>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>

                      {/* Intent Content */}
                      {isExpanded && (
                        <div className="border-t border-border px-6 py-5 bg-secondary/20 space-y-5">
                          {/* Question */}
                          <div>
                            <Label className="text-foreground font-medium">
                              Question
                            </Label>
                            <Input
                              value={intent.question}
                              onChange={(e) =>
                                updateIntent(intent.id, 'question', e.target.value)
                              }
                              placeholder="What is the user asking?"
                              required
                              className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                            />
                          </div>

                          {/* Response */}
                          <div>
                            <Label className="text-foreground font-medium">
                              Response
                            </Label>
                            <textarea
                              value={intent.response}
                              onChange={(e) =>
                                updateIntent(intent.id, 'response', e.target.value)
                              }
                              placeholder="How should the AI respond?"
                              rows={3}
                              required
                              className="mt-2 w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            />
                          </div>

                          {/* Follow-up Question (Optional) */}
                          <div>
                            <Label className="text-foreground font-medium">
                              Follow-up Question (Optional)
                            </Label>
                            <Input
                              value={intent.followUpQuestion || ''}
                              onChange={(e) =>
                                updateIntent(intent.id, 'followUpQuestion', e.target.value)
                              }
                              placeholder="Any follow-up question after the response?"
                              className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                            />
                          </div>

                          {/* Redirect */}
                          <div>
                            <Label className="text-foreground font-medium">
                              Redirect (Optional)
                            </Label>
                            <Input
                              value={intent.redirect || ''}
                              onChange={(e) =>
                                updateIntent(intent.id, 'redirect', e.target.value)
                              }
                              placeholder="URL or destination for redirect"
                              className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                            />
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeIntent(intent.id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove Intent
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              disabled={!title || intents.length === 0 || isSubmitting}
              className="w-full px-6 py-3 rounded-lg bg-blue-700 text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}