import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useParams, Navigate } from "react-router-dom";
import MarkdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMultimdTable from "markdown-it-multimd-table";
import markdownItContainer from "markdown-it-container";

const md = new MarkdownIt({ html: true })
    .use(markdownItFootnote)
    .use(markdownItMultimdTable, { headerless: true, rowspan: true });

function Notfound(){
    return (
        <>
            <h1>404</h1>
            <div>페이지를 찾을 수 없습니다...</div>
        </>
    );
}

function Doc(){
    const { id } = useParams();
    const [content, setContent] = useState("불러오는 중...");
    
    useEffect(() => {
        async function getDoc(){
            try{
                const res = await fetch(`/api/getDoc?id=${encodeURIComponent(id)}`);
                if(!res.ok) throw new Error('문서 불러오기 실패');
                const text = await res.text();
                setContent(md.render(text));
            } catch(err) {
                setContent(`<p>오류: ${err.message}</p>`);
            }
        }
        getDoc();
    }, [id]);
    
    return (
        <>
            <h1>{id}</h1>
            <div dangerouslySetInnerHTML={{ __html: content }}></div>
        </>
    );
}

export default function App() {
    const [doclist, setDoclist] = useState([]);
    const [target, setTarget] = useState('');
    const [visibility, setVisibility] = useState(true);
    
    useEffect(() => {
        async function getDoclist(){
            try{
                const res = await fetch(`/api/getDoclist`);
                if(!res.ok) throw new Error('문서 목록 불러오기 실패');
                const json = await res.json();
                setDoclist(json);
            } catch(err) {
                console.log(`에러: ${err.message}`);
            }
        }
        getDoclist();
    }, []);
    
    return (
        <>
            <nav>
                <img src="/data/imgs/logo.png" id="logo" />
                <input spellCheck="false" id="search" onFocus={() => setVisibility(true)} onChange={e => setTarget(e.target.value)} />
            </nav>
            {visibility && (
            <div id="searchlist">
                {doclist.filter(doc => doc.name.startsWith(target)).sort((a, b) => a.name.length - b.name.length).slice(0, 5).map(doc => (
                    <Link to={`/doc/${doc.path}`} key={doc.name}><div>{doc.name}</div></Link>
                ))}
            </div>
            )}
            <div onClick={() => setVisibility(false)}>
                <Routes>
                    <Route path="/" element={<Navigate to="/doc/대문" replace />} />
                    <Route path="/doc/:id" element={<Doc />} />
                    <Route path="*" element={<Notfound />} />
                </Routes>
            </div>
        </>
    );
}