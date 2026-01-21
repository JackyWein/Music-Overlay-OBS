using System;
using System.Globalization;

public class CPHInline
{
    public bool Execute()
    {
        try 
        {
            // 1. Daten sicher holen
            string title = args.ContainsKey("ytm.title") ? args["ytm.title"].ToString() : "Kein Titel";
            string artist = args.ContainsKey("ytm.artist") ? args["ytm.artist"].ToString() : "Kein Interpret";
            string cover = args.ContainsKey("ytm.imageSrc") ? args["ytm.imageSrc"].ToString() : "";
            string album = args.ContainsKey("ytm.album") ? args["ytm.album"].ToString() : "";

            // 2. ZEITEN IN MILLISEKUNDEN (Sicher mit InvariantCulture parsen)
            double durationSec = 0;
            if (args.ContainsKey("ytm.songDuration"))
            {
                double.TryParse(args["ytm.songDuration"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out durationSec);
            }

            double elapsedSec = 0;
            if (args.ContainsKey("ytm.elapsedSeconds"))
            {
                double.TryParse(args["ytm.elapsedSeconds"].ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out elapsedSec);
            }

            long durationMs = (long)(durationSec * 1000);
            long positionMs = (long)(elapsedSec * 1000);

            // isPaused Status (Robust Check)
            bool isPaused = false;
            
            // 1. Check Explicit Pause Flag
            if (args.ContainsKey("ytm.isPaused"))
            {
                string pausedStr = args["ytm.isPaused"].ToString().ToLower();
                isPaused = pausedStr == "true" || pausedStr == "1";
            }
            // 2. Fallback: Check Status String (Playing/Paused/Stopped)
            else if (args.ContainsKey("ytm.status"))
            {
                string status = args["ytm.status"].ToString().ToLower();
                isPaused = status != "playing"; // Paused if not playing
            }
            
            // 3. Fallback: If no title, must be stopped
            if (title == "Kein Titel" || string.IsNullOrEmpty(title))
            {
                isPaused = true;
            }

            // Anführungszeichen sauber escapen für JSON
            title = title.Replace("\\", "\\\\").Replace("\"", "\\\"");
            artist = artist.Replace("\\", "\\\\").Replace("\"", "\\\"");
            album = album.Replace("\\", "\\\\").Replace("\"", "\\\"");
            cover = cover.Replace("\\", "\\\\").Replace("\"", "\\\"");

            // 3. JSON manuell bauen (sicherer als Serializer wenn nicht verfügbar)
            string json = "{";
            json += "\"name\": \"MusicUpdate\",";
            json += "\"title\": \"" + title + "\",";
            json += "\"artist\": \"" + artist + "\",";
            json += "\"album\": \"" + album + "\",";
            json += "\"cover\": \"" + cover + "\",";
            json += "\"positionMs\": " + positionMs + ",";
            json += "\"durationMs\": " + durationMs + ",";
            json += "\"isPlaying\": " + (!isPaused).ToString().ToLower();
            json += "}";

            CPH.WebsocketBroadcastJson(json);
            return true;
        }
        catch (Exception ex)
        {
            CPH.LogInfo("MusicOverlay Error: " + ex.Message);
            return false;
        }
    }
}