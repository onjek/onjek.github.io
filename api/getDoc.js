export default async function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        res.status(400).json({ error: "id 필요" });
        return;
    }
    const url = `https://raw.githubusercontent.com/onjek/data/main/docs/${id}.md`;
    
    try {
    const response = await fetch(url);
    
    if (!response.ok) {
        res.status(response.status).json({ error: `GitHub fetch 실패: ${response.statusText}` });
        return;
    }
    const text = await response.text();
    
    res.status(200).send(text);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "서버 오류: " + err.message });
    }
}