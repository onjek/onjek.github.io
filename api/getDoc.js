import fetch from "node-fetch";

export default async function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        res.status(400).json({ "오류: id 필요" });
        return;
    }
    
    const url = `https://raw.githubusercontent.com/onjek/data/main/docs/${id}.md`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("fetch 실패");
        
        const text = await response.text();
        
        res.status(200).send(text);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}