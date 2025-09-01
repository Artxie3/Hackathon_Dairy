# Calendar Notes Feature

## Overview
The calendar now supports adding notes, tasks, and reminders directly on specific dates. This feature allows you to:

- Add notes for any date
- Create tasks with different priority levels
- Set reminders for important dates
- View all your calendar items in one place
- Organize your schedule with tags

## How to Use

### Adding Notes
1. **Double-click on any date** in the calendar to open the note creation modal
2. **Click the "Add Note" button** in the calendar header to add a note for today
3. **Fill in the note details:**
   - Title (required)
   - Content (optional)
   - Type: Note, Task, or Reminder
   - Priority: Low, Medium, or High
   - Tags (optional)

### Note Types
- **Note**: General information or thoughts for a specific date
- **Task**: Action items that need to be completed
- **Reminder**: Important dates or events to remember

### Priority Levels
- **Low**: Not urgent, can be done later
- **Medium**: Normal priority
- **High**: Urgent, needs attention soon

### Managing Notes
- **Edit**: Click on any note indicator in the calendar to edit
- **Delete**: Use the delete function in the edit modal
- **Complete**: Mark tasks as completed (they will appear with reduced opacity)

### Visual Indicators
The calendar shows different indicators for each type of note:
- 🔵 **Blue**: Notes
- 🟢 **Green**: Tasks  
- 🟡 **Yellow**: Reminders

Priority levels are indicated by opacity:
- **Low**: 70% opacity
- **Medium**: 85% opacity
- **High**: 100% opacity + red border glow

### Keyboard Shortcuts
- **Double-click**: Add note for a specific date
- **Enter**: Add tag when typing in the tags field

## Database Schema

The feature uses a new `calendar_notes` table with the following structure:

```sql
CREATE TABLE calendar_notes (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    note_date DATE NOT NULL,
    note_type TEXT DEFAULT 'note',
    priority TEXT DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## Features

### Responsive Design
- Works on all screen sizes
- Touch-friendly on mobile devices
- Optimized layout for different viewports

### Dark Mode Support
- Automatically adapts to your theme preference
- Consistent styling across light and dark modes

### Real-time Updates
- Notes appear immediately after creation
- Changes sync across all components
- No page refresh required

### Search and Filter
- Notes are included in the overall diary search
- Filter by tags and note types
- View notes by date range

## Integration

The calendar notes feature is fully integrated with:
- **Diary Entries**: View all your content in one place
- **Hackathon Events**: See your schedule alongside project deadlines
- **GitHub Sync**: Keep track of development milestones
- **User Authentication**: Secure, user-specific notes

## Future Enhancements

Planned features include:
- Recurring notes and tasks
- Calendar export functionality
- Email reminders
- Integration with external calendar services
- Advanced filtering and search options
- Note templates for common use cases

## Support

If you encounter any issues or have suggestions for improvements, please:
1. Check the console for error messages
2. Ensure you're logged in to your account
3. Try refreshing the page
4. Contact support with specific error details
