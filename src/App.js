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
				.use(markdownItRuby)
    .use(markdownItMultimdTable, { headerless: true, rowspan: true })
    .use(markdownItUnderline)
				.use(markdownItTag)
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

const defaultTextRenderer = md.renderer.rules.text;

md.renderer.rules.text = function(tokens, idx, options, env, self){
	if(tokens[idx].meta && tokens[idx].meta.hidden){
		return '';
	}
	return defaultTextRenderer(tokens, idx, options, env, self);
}

md.renderer.rules['text-sep'] = () => '';

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

function markdownItRuby(md){
	md.inline.ruler.before('link', 'ruby', function (state, silent){
		const src = state.src;
		let start = state.pos;
		
		if (src[start] !== '[') return false;
		
		const bottomStart = start + 1;
		let bottomEnd = src.indexOf(']', bottomStart);
		
		if (bottomEnd === -1) return false;
		if (src[bottomEnd + 1] !== '^' || src[bottomEnd + 2] !== '(') return false;
		
		const topStart = bottomEnd + 3;
		let topEnd = src.indexOf(')', topStart);
		
		if (topEnd === -1) return false;
		if (!silent){
			const bottomText = src.slice(bottomStart, bottomEnd);
			const topText = src.slice(topStart, topEnd);
			
			const bottomArr = Array.from(bottomText);
			const topArr = topText.trim().split(/\s+/);

			const sepToken = state.push('text-sep', '', 0);
			
			const textToken = state.push('text', '', 0);
			textToken.content = bottomText;
			textToken.meta = { hidden: true };
			
			const token = state.push('ruby', 'ruby', 0);
			
			if(bottomArr.length === topArr.length){
				token.meta = {
					type: 'plural',
					pairs: bottomArr.map((el, i) => ({
						rb: el,
						rt: topArr[i]
					}))
				};
			}
			else{
				token.meta = {
					type: 'singular',
					rb: bottomText,
					rt: topText
				};
			}
		}
		state.pos = topEnd + 1;
		
		return true;
	});
	md.renderer.rules.ruby = function (tokens, idx){
		const meta = tokens[idx].meta;
		
		if(meta.type == 'plural'){
			return meta.pairs.map(({rb, rt}) =>
				`<ruby><rb>${md.utils.escapeHtml(rb)}</rb><rt>${md.utils.escapeHtml(rt)}</rt></ruby>`
			).join('');
		}
		else{
			return `<ruby><rb>${md.utils.escapeHtml(meta.rb)}</rb><rt>${md.utils.escapeHtml(meta.rt)}</rt></ruby>`;
		}
	};
}

function markdownItUnderline(md){
	md.inline.ruler.before('emphasis', 'underline', function (state, silent){
		const src = state.src;
		const start = state.pos;
		
		if (src[start] !== '+' || src[start + 1] !== '+') return false;
		
		const max = state.posMax;
		let i = start + 2;
		
		while (i < max){
			if (state.src[i] === '+' && state.src[i + 1] === '+') {
				if (!silent){
					const content = src.slice(start + 2, i);
					const tokenOpen = state.push('underline_open', 'span', 1);
					tokenOpen.attrs = [['class', 'underlined']];
					
					const children = [];
					
					state.md.inline.parse(
						content,
						state.md,
						state.env,
						children
					);
					for (let j = 0; j < children.length; j++){
						state.tokens.push(children[j]);
					}
					state.push('underline_close', 'span', -1);
				}
				state.pos = i + 2;
				
				return true;
			}
			i++;
		}
		return false;
	});
}

function markdownItTag(md){
	md.inline.ruler.after('underline', 'tag', function (state, silent){
		const src = state.src;
		const start = state.pos;
		
		if (src[start] !== '[' || src[start + 1] !== ':') return false;
		
		const max = state.posMax;
		let i = start + 2;
		
		while (i < max){
			if (state.src[i] === ']'){
				if (!silent){
					const content = src.slice(start + 2, i);
					const tagOpen = state.push('tag_open', 'span', 1);
					tagOpen.attrs = [['class', 'tag']];
					
					const children = [];
					state.md.inline.parse(
						content,
						state.md,
						state.env,
						children
						);
						
						for (let j = 0; j < children.length; j++){
							state.tokens.push(children[j]);
						}
						state.push('tag_close', 'span', -1);
					}
					state.pos = i + 1;
					
					return true;
				}
				i++;
			}
			return false;
		});
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
                const processed_text = text.replace(/(?<=[^\!])\[\[([^\[\]]+)\]\]\(([^\[\]\(\)]+)\)/g, `<a href="./$2">$1</a>`)
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
