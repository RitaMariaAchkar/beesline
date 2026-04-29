const express = require("express");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");
const FormData = require("form-data");

const app = express();
app.use(cors());
app.use(express.json());

// Keep the file in memory so we can forward it to YouCam
const upload = multer({ storage: multer.memoryStorage() });

// const API_KEY = process.env.YOUCAM_API_KEY;
const API_KEY = "sk-4XMBQoZ9wYZ6hpz21SvVWuJ9XMhSPs1QTnJ5cyW40u93ddAjjHfPNluZuT9A8n_s";
const BASE_URL = "https://yce-api-01.makeupar.com";

if (!API_KEY) {
    throw new Error("Missing YOUCAM_API_KEY in environment variables");
}

async function createRemoteFile(file) {
    // Step 1: ask YouCam/File API for a pre-signed upload URL + file_id
    const createFileResp = await axios.post(
        `${BASE_URL}/s2s/v2.0/file`,
        {
            files: [
                {
                    content_type: file.mimetype,
                    file_name: file.originalname,
                    file_size: file.size,
                },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
        },
    );

    const { file_id, requests } = createFileResp.data;

    if (!file_id || !requests?.url) {
        throw new Error(`Unexpected File API response: ${JSON.stringify(createFileResp.data)}`);
    }

    // Step 2: upload the actual image bytes to the pre-signed URL
    await axios.put(requests.url, file.buffer, {
        headers: {
            "Content-Type": file.mimetype || "application/octet-stream",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });

    return file_id;
}

app.post("/analyze", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        // STEP 1: create file + upload image
        const createFileResp = await axios.post(
            `${BASE_URL}/s2s/v1.0/file`,
            {
                files: [
                    {
                        content_type: req.file.mimetype,
                        file_name: req.file.originalname,
                        file_size: req.file.size,
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        console.log("FILE RESPONSE:", createFileResp.data);

        const fileData = createFileResp.data.data.files[0];

        const fileId = createFileResp.data.data.files[0].file_id;

        const uploadUrl = fileData.requests[0].url;

        if (!fileId || !uploadUrl) {
            return res.status(500).json({
                error: "No file_id or upload URL returned",
                raw: createFileResp.data,
            });
        }

        // STEP 2: upload actual image bytes
        await axios.put(uploadUrl, req.file.buffer, {
            headers: {
                "Content-Type": req.file.mimetype,
            },
        });

        // STEP 3: start skin analysis
        const taskResp = await axios.post(
            `${BASE_URL}/s2s/v2.0/task/skin-analysis`,
            {
                file_id: fileId,
            },
            {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
            },
        );

        console.log("TASK RESPONSE:", taskResp.data);

        res.json({
            task_id: taskResp.data.task_id,
            raw: taskResp.data,
        });
    } catch (error) {
        console.log("FULL ERROR:");
        console.log(error.response?.status);
        console.log(error.response?.data || error.message);

        res.status(500).json({
            error: "Analyze failed",
            details: error.response?.data || error.message,
        });
    }
});

app.get("/check-status/:taskId", async (req, res) => {
    try {
        const { taskId } = req.params;

        const response = await axios.get(`${BASE_URL}/s2s/v2.0/task/skin-analysis/${taskId}`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
            },
        });

        res.json(response.data);
    } catch (error) {
        const details = error.response?.data || error.message;
        console.error("Status check error:", details);
        res.status(500).json({
            error: "Polling failed",
            details,
        });
    }
});

app.listen(3000, () => {
    console.log("Server listening on http://localhost:3000");
});
