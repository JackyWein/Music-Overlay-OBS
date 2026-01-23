using System;

public class CPHInline
{
    public bool Execute()
    {
        // Broadcast "music_uncompact" to wake up the widget
        // Use this for the !song command in Streamer.bot
        // It's much faster/lighter than sending the full song data again
        
        CPH.WebsocketBroadcastJson("{\"event_name\":\"music_uncompact\"}");

        return true;
    }
}
