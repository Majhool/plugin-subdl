import axios from "axios";
import { rpcClient } from "./message";

export class Client {
  apiKey = "";

  constructor(options = {}) {
    this.rpc = new rpcClient(iina);
    
    this.rpc.$getApiKey = async () => {
      const username = iina.preferences.get("username") || "";
      if (username) {
        this.apiKey = username;
      }
      return { username };
    };

    this.rpc.$getApiKey().then(({ username }) => {
      this.apiKey = username;
    });
  }

  get loggedIn() {
    return !!this.apiKey;
  }

  async login(username, password) {
    this.apiKey = username;
    iina.preferences.set("username", username);
    iina.preferences.sync();
    return { token: this.apiKey, jwtSaved: true, user: { level: "VIP" } };
  }

  async logout() {
    this.apiKey = null;
    iina.preferences.set("username", "");
    iina.preferences.sync();
    return { status: "logged out" };
  }

  async getUserInfo() {
    return { user: { allowed_downloads: 9999, level: "SubDL User" } };
  }

  async getLanguages() {
    return {
      data: [
         { language_code: "ar", language_name: "Arabic" },
         { language_code: "en", language_name: "English" },
         { language_code: "fr", language_name: "French" },
         { language_code: "es", language_name: "Spanish" },
         { language_code: "ru", language_name: "Russian" },
         { language_code: "fa", language_name: "Persian" },
         { language_code: "tr", language_name: "Turkish" },
         { language_code: "pt-PT", language_name: "Portuguese" },
         { language_code: "de", language_name: "German" },
         { language_code: "nl", language_name: "Dutch" },
         { language_code: "it", language_name: "Italian" },
         { language_code: "pl", language_name: "Polish" },
         { language_code: "ko", language_name: "Korean" },
      ]
    };
  }

  async search(options) {
    const params = {
      api_key: this.apiKey,
      film_name: options.query,
      type: options.type === "movie" || options.type === "tv" ? options.type : undefined,
      languages: options.languages ? options.languages.toUpperCase() : "EN",
      releases: 1,
      hi: options.hearing_impaired ? 1 : undefined
    };

    const res = await axios.get("https://api.subdl.com/api/v1/subtitles", { params });
    if (!res.data || !res.data.status) {
       throw new Error(res.data?.error || "Failed to search subtitles");
    }

    const subtitles = res.data.subtitles || [];
    
    const mappedData = subtitles.map(sub => {
       const url = sub.url || `${res.data.results?.[0]?.sd_id || sub.sd_id || sub.id || Math.floor(Math.random()*1000)}`;
       return {
         id: sub.sd_id || sub.id || url,
         attributes: {
            release: sub.release_name || sub.name || "SubDL Release",
            feature_details: {
               title: params.film_name || "Unknown",
               year: sub.year || ""
            },
            download_count: sub.downloads || 0,
            language: (sub.language || params.languages).toLowerCase(),
            hearing_impaired: sub.hi || false,
            fps: sub.fps || "",
            upload_date: sub.date || new Date().toISOString(),
            files: [{
               file_id: url,
               file_name: `${sub.name || "subtitle"}.zip`
            }],
            url: `https://subdl.com/s/subtitle/${sub.sd_id || sub.id || url}`
         }
       };
    });

    return {
       data: mappedData,
       page: 1,
       total_pages: 1
    };
  }

  async download(idList) {
    const items = idList.map(fid => {
       let link = String(fid);
       if (!link.startsWith('http')) {
           link = `https://dl.subdl.com/subtitle/${fid}.zip`;
       }
       let file_name = link.split('/').pop();
       if (!file_name.endsWith('.zip')) file_name += '.zip';
       return { link, file_name };
    });
    
    await this.rpc.$downloadFile(items);
    
    return {
       requests: 1,
       remaining: 99,
       message: "Downloaded zip file"
    };
  }
}
export const API = {};
