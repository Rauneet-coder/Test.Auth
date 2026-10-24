import Icon from '../Icon';

export default function WorkspaceFooter({ onGuide }) {
  return <footer className="workspace-footer"><span><Icon name="lock" size={12}/> A small playground. A real authentication flow.</span><button type="button" onClick={onGuide}>Explore the API <Icon name="arrow" size={13}/></button><span className="workspace-footer-credit">Thoughtfully built with <strong>aith.</strong></span></footer>;
}
