import Link from "next/link";
import Icon from "../../components/icon";

export const metadata = { title: "Reminders" };

export default function RemindersPage() {
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">A GENTLE NUDGE, RIGHT ON TIME</p><h1>My reminders<span>.</span></h1><p>Choose the action that matches what you need today.</p></div>
    </div>
    <section className="reminder-welcome panel">
      <span className="intro-icon"><Icon name="bell" size={28} /></span>
      <div><h2>Stay informed without checking the app every hour.</h2><p>ClassFlow can send Biovators assignment updates by email and WhatsApp. Your details are only used for our class reminders.</p></div>
    </section>
    <div className="choice-grid">
      <Link href="/register" className="choice-card"><span className="stat-icon green"><Icon name="plus" /></span><div><p className="eyebrow">NEW HERE?</p><h2>Register for reminders</h2><p>Add your name, email address and WhatsApp number to our reminder list.</p><span className="choice-action">Start registration <Icon name="arrow" size={16} /></span></div></Link>
      <Link href="/update-phone" className="choice-card"><span className="stat-icon orange"><Icon name="clock" /></span><div><p className="eyebrow">ALREADY REGISTERED?</p><h2>Update my WhatsApp number</h2><p>Keep your existing registration and replace only the phone number attached to it.</p><span className="choice-action">Update number <Icon name="arrow" size={16} /></span></div></Link>
    </div>
    <div className="plain-note"><Icon name="shield" size={18} /><div><strong>Not sure which option to choose?</strong><p>If you have previously registered with your email address, choose “Update my WhatsApp number.”</p></div></div>
  </>;
}
