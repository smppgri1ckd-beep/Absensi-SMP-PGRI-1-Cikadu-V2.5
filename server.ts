var __defProp=Object.defineProperty;var __name=(target,value)=>__defProp(target,"name",{value,configurable:true});import express from"express";import http from"http";import{createServer as createViteServer}from"vite";import path from"path";import{fileURLToPath}from"url";import dotenv from"dotenv";import{GoogleGenAI}from"@google/genai";dotenv.config();const __filename=fileURLToPath(import.meta.url);const __dirname=path.dirname(__filename);const app=express();const PORT=process.env.PORT||3e3;app.use(express.json({limit:"10mb"}));const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY,httpOptions:{headers:{"User-Agent":"aistudio-build"}}});app.post("/api/ai/analyze-attendance",async(req,res)=>{try{const{schoolName,date,totalStudents,stats,classSummaries,atRiskStudents}=req.body;const prompt=`
Anda adalah Konsultan Ahli Manajemen Sekolah dan Pembina Kesiswaan untuk ${schoolName||"SMP PGRI 1 Cikadu"}.
Analisis data presensi dan kedisiplinan siswa pada tanggal ${date||"Hari Ini"}:

Data Statistik:
- Total Siswa Terdaftar: ${totalStudents||0}
- Hadir Tepat Waktu: ${stats?.hadir||0}
- Terlambat: ${stats?.terlambat||0}
- Izin: ${stats?.izin||0}
- Sakit: ${stats?.sakit||0}
- Alpa (Tanpa Keterangan): ${stats?.alpa||0}

Ringkasan Kelas:
${JSON.stringify(classSummaries||[],null,2)}

Daftar Siswa yang Butuh Perhatian Khusus (Sering terlambat/alpa/izin):
${JSON.stringify(atRiskStudents||[],null,2)}

Tolong berikan analisis komprehensif, terstruktur, empati namun tegas dalam format JSON murni:
{
  "ringkasanEksekutif": "Ringkasan kondisi kedisiplinan hari ini dalam 2-3 kalimat tajam dan solutif.",
  "skorKedisiplinan": 85, // Angka 0 - 100
  "predikatKedisiplinan": "Sangat Baik / Baik / Cukup / Perlu Perhatian Khusus",
  "rekomendasiSekolah": [
    "Saran tindakan operasional 1 untuk Guru Piket / Kepala Sekolah",
    "Saran tindakan 2 untuk Wali Kelas dan Guru BK",
    "Saran tindakan 3 untuk peningkatan disiplin waktu apel pagi"
  ],
  "analisisPerKelas": [
    {
      "kelas": "7A",
      "tingkatKehadiran": "95%",
      "catatan": "Catatan singkat kondisi kelas"
    }
  ],
  "rekomendasiSiswa": [
    {
      "nisn": "009...",
      "nama": "Nama Siswa",
      "kelas": "7A",
      "statusMasalah": "Terlambat / Alpa / Sering Izin",
      "urgensi": "Tinggi / Sedang / Rendah",
      "akarMasalahDugaan": "Dugaan penyebab berdasarkan pola",
      "langkahPenanganan": "Langkah bimbingan konseling konkret",
      "draftPesanWhatsAppOrtu": "Draft pesan WhatsApp sopan, jelas, dan membangun kemitraan antara sekolah dan orang tua"
    }
  ]
}
`;const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:prompt,config:{systemInstruction:"Anda adalah pakar psikologi pendidikan, kesiswaan, dan tata kelola sekolah menengah pertama (SMP). Selalu respon dalam format JSON murni bahasa Indonesia tanpa markdown backticks.",responseMimeType:"application/json"}});const textOutput=response.text||"{}";let parsedResult;try{parsedResult=JSON.parse(textOutput)}catch{const cleaned=textOutput.replace(/```json/g,"").replace(/```/g,"").trim();parsedResult=JSON.parse(cleaned)}res.json({success:true,data:parsedResult})}catch(error){console.error("Error generating AI attendance analysis:",error);res.status(500).json({success:false,error:error?.message||"Gagal memproses analisis AI presensi"})}});app.post("/api/ai/generate-wa-message",async(req,res)=>{try{const{studentName,className,status,detail,parentName,schoolName}=req.body;const prompt=`
Buatlah draf pesan WhatsApp resmi namun ramah dari pihak sekolah ${schoolName||"SMP PGRI 1 Cikadu"} kepada Orang Tua/Wali Murid:
- Nama Siswa: ${studentName}
- Kelas: ${className}
- Status Hari Ini: ${status} (${detail||"Kehadiran"})
- Nama Orang Tua/Wali: ${parentName||"Bapak/Ibu Orang Tua Siswa"}

Format pesan harus:
1. Salam hangat dan pembuka resmi
2. Informasi status kehadiran secara jelas (jam, tanggal, dan alasan bila ada)
3. Pesan pengingat / motivasi / permohonan konfirmasi
4. Penutup dengan nama Wali Kelas / Petugas Piket SMP PGRI 1 Cikadu
Berikan respon JSON: { "message": "isi teks whatsapp" }
`;const response=await ai.models.generateContent({model:"gemini-3.8-flash",contents:prompt,config:{responseMimeType:"application/json"}});const textOutput=response.text||"{}";const parsed=JSON.parse(textOutput);res.json({success:true,message:parsed.message||""})}catch(error){console.error("Error generating WA message:",error);res.status(500).json({success:false,error:error?.message||"Gagal membuat draf pesan WhatsApp"})}});async function startServer(){const isProd=process.env.NODE_ENV==="production";const httpServer=http.createServer(app);if(!isProd){const isHmrDisabled=process.env.DISABLE_HMR==="true";const vite=await createViteServer({server:{middlewareMode:true,hmr:isHmrDisabled?false:{server:httpServer}},appType:"spa"});app.use(vite.middlewares)}else{app.use(express.static(path.resolve(__dirname,"dist")));app.get("*",(_req,res)=>{res.sendFile(path.resolve(__dirname,"dist","index.html"))})}httpServer.listen(PORT,()=>{console.log(`Server listening on http://localhost:${PORT}`)})}__name(startServer,"startServer");startServer();
