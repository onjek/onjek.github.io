export default async function handler(req, res) {
    const url = 'https://raw.githubusercontent.com/onjek/data/main/assets/tree.json';
    
    try {
    const response = await fetch(url);
    
    if (!response.ok) {
        res.status(response.status).json({ error: `GitHub fetch 실패: ${response.statusText}` });
        return;
    }
    const data = await response.json();
    
    res.status(200).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "서버 오류: " + err.message });
    }
}