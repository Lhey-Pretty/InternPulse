<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('is_read', 'asc')
            ->latest()
            ->paginate(10);

        return $this->ok('Notifications retrieved.', [
            'notifications' => $notifications,
            'unread_count' => $request->user()->unreadNotificationsCount(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return $this->ok('Unread count retrieved.', [
            'unread_count' => $request->user()->unreadNotificationsCount(),
        ]);
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        $notification->markAsRead();

        return $this->ok('Notification marked as read.', $notification->fresh());
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()
            ->notifications()
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return $this->ok('All notifications marked as read.');
    }
}
