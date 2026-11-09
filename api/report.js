import {Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Footer, PageNumber} from 'docx';

function reportParagraphs(text) {
  const paragraphs = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      paragraphs.push(new Paragraph({spacing:{after:100}}));
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
      paragraphs.push(new Paragraph({text:heading[2].replace(/\*\*/g,''),heading:levels[heading[1].length-1],spacing:{before:260,after:120}}));
      continue;
    }
    if (/^(?:\d+[.、]|[一二三四五六七八九十]+[、.])\s*/.test(line) && line.length < 90) {
      paragraphs.push(new Paragraph({text:line.replace(/\*\*/g,''),heading:HeadingLevel.HEADING_2,spacing:{before:220,after:100}}));
      continue;
    }
    const bullet=line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      paragraphs.push(new Paragraph({children:[new TextRun({text:bullet[1].replace(/\*\*/g,''),font:'Microsoft YaHei',size:22})],bullet:{level:0},spacing:{after:90,line:340}}));
      continue;
    }
    paragraphs.push(new Paragraph({children:[new TextRun({text:line.replace(/\*\*/g,''),font:'Microsoft YaHei',size:22})],spacing:{after:120,line:360}}));
  }
  return paragraphs;
}

export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {title='产品创意压力测试报告',report='',requirement=''}=req.body||{};
  if(!report.trim()) return res.status(400).json({error:'当前没有可导出的报告'});
  const doc=new Document({
    styles:{default:{document:{run:{font:'Microsoft YaHei',size:22,color:'1D2D24'},paragraph:{spacing:{line:340}}}},paragraphStyles:[
      {id:'Title',name:'Title',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Microsoft YaHei',size:38,bold:true,color:'000000'},paragraph:{alignment:AlignmentType.CENTER,spacing:{after:260}}},
      {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Microsoft YaHei',size:30,bold:true,color:'000000'},paragraph:{spacing:{before:300,after:140}}},
      {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Microsoft YaHei',size:26,bold:true,color:'000000'},paragraph:{spacing:{before:240,after:110}}},
      {id:'Heading3',name:'Heading 3',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Microsoft YaHei',size:23,bold:true,color:'000000'},paragraph:{spacing:{before:190,after:90}}}
    ]},
    sections:[{properties:{page:{margin:{top:1080,right:1080,bottom:1080,left:1080}}},footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Idea Crash Lab  ·  ',color:'777777',size:18}),new TextRun({children:[PageNumber.CURRENT],color:'777777',size:18})]})]})},children:[
      new Paragraph({text:title,style:'Title'}),
      new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`生成日期 ${new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})}`,color:'6A756E',size:20})],spacing:{after:320}}),
      new Paragraph({text:'已确认的产品需求',heading:HeadingLevel.HEADING_1}),
      ...reportParagraphs(requirement),
      new Paragraph({text:'产品创意压力测试报告',heading:HeadingLevel.HEADING_1}),
      ...reportParagraphs(report)
    ]}]
  });
  const buffer=await Packer.toBuffer(doc);
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition','attachment; filename="Idea-Crash-Lab-Report.docx"');
  return res.status(200).send(buffer);
}
