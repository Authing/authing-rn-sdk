require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "authing-rn-sdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  authing-rn-sdk
                   DESC
  s.homepage     = "https://github.com/Authing/authing-rn-sdk"
  s.license      = "MIT"
  # s.license    = { :type => "MIT", :file => "FILE_LICENSE" }
  s.authors      = { "liaochangjiang" => "cj@authing.cn" }
  s.platforms    = { :ios => "9.0" }
  s.source       = { :git => "https://github.com/Authing/authing-rn-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,swift}"
  s.requires_arc = true

  s.dependency "React"
  # ...
  # s.dependency "..."
  s.dependency "AlipaySDK-iOS"
end

