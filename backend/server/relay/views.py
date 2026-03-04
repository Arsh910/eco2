from django.http import JsonResponse
from django.views import View
from server.relay.session_manager import session_manager

class TransferMonitorView(View):
    async def get(self, request):
        sessions = session_manager.get_all_sessions()
        
        stats = []
        for session in sessions:
            stats.append({
                'transfer_id': session.transfer_id,
                'created_at': session.created_at,
                'sender_connected': session.sender_ws is not None,
                'receiver_connected': session.receiver_ws is not None,
                'buffer_stats': session.buffer.get_stats() if hasattr(session, 'buffer') else None,
            })
        
        return JsonResponse({
            'active_sessions': len(sessions),
            'sessions': stats
        })
