import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { Routes, Route, Link, useParams, Navigate } from "react-router-dom";
import MarkdownIt from "markdown-it";
import markdownItFootnote from "markdown-it-footnote";
import markdownItMultimdTable from "markdown-it-multimd-table";
import markdownItContainer from "markdown-it-container";
import markdownItAnchor from "markdown-it-anchor";
import markdownItTOC from "markdown-it-table-of-contents";
import uslug from "uslug";
import { disassemble } from "es-hangul";

const md = new MarkdownIt({ html: true })
    .use(markdownItFootnote)
    .use(markdownItMultimdTable, { headerless: true, rowspan: true })
    .use(markdownItUnderline)
				.use(markdownItTh)
				.use(markdownItAnchor, {
					slugify: s => uslug(s)
				})
				.use(markdownItTOC, {
					includeLevel: [2, 3, 4],
					markerPattern: /^:::\s?toc\s?:::/im,
					transformContainerOpen: () => {
						return '<div class="toc"><details><summary>목차</summary>';
					},
					transformContainerClose: () => {
						return '</details></div>';
					}
				})
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
    })
				.use(markdownItContainer, 'tab', {
        render: function(tokens, idx, options, env){
            const token = tokens[idx];
            if(token.nesting === 1){
                env.tabIdx = env.tabIdx ?? 0;
                env.tabIdx += 1;
                env.tabButtonIdx = 0;
                return '<div class="tab">\n';
            }
            else{
                return '</div>\n';
            }
        }
    })
				.use(markdownItContainer, 'tab-group', {
        render: function(tokens, idx, options, env){
            const token = tokens[idx];
            if(token.nesting === 1){
                return '<div class="tab-group">\n';
            }
            else{
                return '</div>\n';
            }
        }
    })
				.use(markdownItContainer, 'tab-button', {
        render: function(tokens, idx, options, env){
            const token = tokens[idx];
            if(token.nesting === 1){
                env.tabButtonIdx += 1;
                return `<input type="radio" name="tab-${env.tabIdx}" class="tab-input" id="tab-input-${env.tabIdx}-${env.tabButtonIdx}"${env.tabButtonIdx == 1 ? ' checked' : ''}>
                        <label class="tab-label" for="tab-input-${env.tabIdx}-${env.tabButtonIdx}">`;
            }
            else{
                return '</label>';
            }
        }
    })
				.use(markdownItContainer, 'tab-content', {
        render: function(tokens, idx, options, env){
            const token = tokens[idx];
            if(token.nesting === 1){
							         return '<div class="tab-content">';
            }
            else{
                return '</div>';
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

function markdownItUnderline(md) {
	md.inline.ruler.push('underline', (state, silent) => {
		const src = state.src;
		let pos = state.pos;
		
		if (src[pos] !== '+' || src[pos + 1] !== '+') return false;
		
		pos += 2;
		
		const start = pos;
		while (pos < state.posMax){
			if (src[pos] === '+' && src[pos + 1] === '+'){
				if (!silent) {
					const token = state.push('underline', 'span', 0);
					token.attrs = [['class', 'underlined']];
					token.content = src.slice(start, pos);
				}
				state.pos = pos + 2;
				return true;
			}
			pos++;
		}
		return false;
	});
	md.renderer.rules.underline = (tokens, i) => `<span class="underlined">${md.utils.escapeHtml(tokens[i].content)}</span>`;
}

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
                const processed_text = text.replace(/\[([^\[\]\(\)]+)\]\^\(([^\[\]\(\)]+)\)/g, `<ruby><rb>$1</rb><rt>$2</rt></ruby>`)
																.replace(/(?<=[^\!])\[\[([^\[\]]+)\]\]\(([^\[\]\(\)]+)\)/g, `<a href="./$2">$1</a>`)
                .replace(/(?<=[^\!])\[\[([^\[\]]+)\]\]/g, `<a href="./$1">$1</a>`)
                .replace(/\!\[\[([^\[\]]+)\]\]/g, `<img src="https://onjek.github.io/data/imgs/$1">`);
                const rendered_text = md.render(processed_text);
                const content_text = rendered_text.replace(/(<h2[^>]*?>[^<]+?<\/h2>)([\s\S]*?)(?=<h2|$)/g, `<details open><summary>$1</summary>$2</details>`)
																.replace(/(<h3[^>]*?>[^<]+?<\/h3>)([\s\S]*?)(?=<details open><summary><h2|<h3|$)/g, `<details open><summary>$1</summary>$2</details>`);
																setContent(content_text);
            } catch(err) {
                setContent(`<p>오류: ${err.message}</p>`);
            }
        }
        getDoc();
    }, [id]);
    
    return (
        <main id="content">
            <header><h1>{id}</h1></header>
            <article dangerouslySetInnerHTML={{ __html: content }} ></article>
        </main>
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
                {doclist.filter(doc => disassemble(doc.name).startsWith(disassemble(target))).sort((a, b) => a.name.length - b.name.length).slice(0, 5).map(doc => (
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
