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

function Doc() {
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
    return (
        <div>
            <Routes>
                <Route path="/" element={<Navigate to="/doc/대문" replace />} />
                <Route path="/doc/:id" element={<Doc />} />
                <Route path="*" element={<Notfound />} />
            </Routes>
        </div>
    );
}