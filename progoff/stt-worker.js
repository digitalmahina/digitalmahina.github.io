/* Offline speech-to-text: Whisper small (q8) via transformers.js, WASM. Model downloads once (~250 MB), then is read from Cache Storage. */
import {pipeline,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels=false;env.useBrowserCache=true;
var asr=null,loading=null;
function load(){if(asr)return Promise.resolve(asr);if(loading)return loading;
  loading=pipeline('automatic-speech-recognition','onnx-community/whisper-small',{dtype:{encoder_model:'q8',decoder_model_merged:'q8'},device:'wasm',
    progress_callback:function(p){if(p.status==='progress')postMessage({type:'progress',file:p.file,loaded:p.loaded,total:p.total})}})
    .then(function(a){asr=a;return a},function(e){loading=null;throw e});return loading}
onmessage=function(e){var m=e.data;
  if(m.type==='load')load().then(function(){postMessage({type:'ready'})},function(err){postMessage({type:'error',msg:String(err&&err.message||err)})});
  else if(m.type==='run')load().then(function(a){postMessage({type:'running',id:m.id});
      return a(m.audio,{language:'russian',task:'transcribe',chunk_length_s:30,stride_length_s:5})})
    .then(function(out){var t=String(out&&out.text||'').trim();if(/^(субтитры|редактор субтитров|продолжение следует|спасибо за просмотр)/i.test(t)&&t.length<60)t='';postMessage({type:'done',id:m.id,text:t})},function(err){postMessage({type:'error',id:m.id,msg:String(err&&err.message||err)})});
};
