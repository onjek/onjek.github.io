import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { Routes, Route, Link, useParams, Navigate } from "react-router-dom";
import MarkdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMultimdTable from "markdown-it-multimd-table";
import markdownItContainer from "markdown-it-container";
import markdownItAnchor from "markdown-it-anchor";
import markdownItTOC from "markdown-it-table-of-contents";

const md = new MarkdownIt({ html: true })
    .use(markdownItFootnote)
    .use(markdownItMultimdTable, { headerless: true, rowspan: true })
    .use(markdownItTh)
    .use(markdownItAnchor)
    .use(markdownItTOC, { markerPattern: /\s*\(\(\s?toc\s?\)\)\s*/i })
    .use(markdownItContainer, 'info', {
        render: function(tokens, idx){
            const token = tokens[idx];
            if(token.nesting === 1){
                return '<div class="info">\n';
            }
            else{
                return '</div>\n';
            }
        }
    });

let depth = 0;

md.renderer.rules.table_open = function(tokens, idx){
    depth++;
    
    if(depth === 1){
		return '<div class="table-container"><div class="table-border">\n<table>\n';
	}
    else{
		return '<table>\n';
	}
};

md.renderer.rules.table_close = function(tokens, idx){
    depth--;
    
    if(depth === 0){
		return '</table>\n</div>\n</div>\n';
	}
    else{
		return '</table>\n';
	}
};

function markdownItTh(md){
    md.core.ruler.after('block', 'th', function(state){
    const tokens = state.tokens;
    
    for(let i = 0; i < tokens.length; i++){
        const token = tokens[i];
        if(token.type === 'inline' && tokens[i - 1]?.type === 'td_open'){
            if(token.content.startsWith('#')){
                tokens[i - 1].tag = 'th';
                tokens[i + 1].tag = 'th';
                token.content = token.content.replace(/^#\s*/, '');
            }
        }
    }
    });
}

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
                const processed_text = text.replace(/(?<=[^\!])\[\[([^\[\]]+)\]\]\(([^\[\]\(\)]+)\)/g, `<a href="./$2">$1</a>`)
                .replace(/(?<=[^\!])\[\[([^\[\]]+)\]\]/g, `<a href="./$1">$1</a>`)
                .replace(/\!\[\[([^\[\]]+)\]\]/g, `<img src="https://onjek.github.io/data/imgs/$1">`);
                
                setContent(md.render(processed_text));
            } catch(err) {
                setContent(`<p>오류: ${err.message}</p>`);
            }
        }
        getDoc();
    }, [id]);
    
    return (
        <div id="content">
            <h1>{id}</h1>
            <div dangerouslySetInnerHTML={{ __html: content }} ></div>
        </div>
    );
}

export default function App() {
    const [doclist, setDoclist] = useState([]);
    const [target, setTarget] = useState('');
    const [visibility, setVisibility] = useState(false);
    const search = useRef();
    
    useEffect(() => {
        async function getDoclist(){
            try{
                const res = await fetch(`/api/getDoclist`);
                if(!res.ok) throw new Error('문서 목록 불러오기 실패');
                const json = await res.json();
                setDoclist(json[0].contents);
            } catch(err) {
                console.log(`에러: ${err.message}`);
            }
        }
        getDoclist();
    }, []);
    
    useEffect(() => {
        if(!search.current) return; 
        const listOff = () => setTimeout(() => setVisibility(false), 100);
        search.current.addEventListener('focusout', listOff);
        return () => search.current.removeEventListener('focusout', listOff);
    }, []);
    
    return (
        <>
            <Helmet>
                <meta name="format-detection" content="telephone=no" />
            </Helmet>
            
            <nav>
                <Link to="/" id="logo"><img src="https://onjek.github.io/data/imgs/logo.svg"/></Link>
                <input spellCheck="false" placeholder="검색어를 입력..." id="search" onFocus={() => setVisibility(true)} onChange={e => setTarget(e.target.value)} ref={search} />
            </nav>
            {visibility && (
            <div id="searchlist">
                {doclist.filter(doc => doc.name.startsWith(target)).sort((a, b) => a.name.length - b.name.length).slice(0, 5).map(doc => (
                    <Link to={`/doc/${doc.name.replace('.md', '')}`} key={doc.name.replace('.md', '')}><div>{doc.name.replace('.md', '')}</div></Link>
                ))}
            </div>
            )}
            <Routes>
                <Route path="/" element={<Navigate to="/doc/대문" replace />} />
                <Route path="/doc/:id" element={<Doc />} />
                <Route path="*" element={<Notfound />} />
            </Routes>
        </>
    );
}
